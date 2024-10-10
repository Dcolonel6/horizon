/**
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use self file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

(function() {
    'use strict';
  
    angular
      .module('horizon.app.core.images')
      .factory('horizon.app.core.images.actions.activate.action.service', activateService);
  
      activateService.$inject = [
      '$q',
      'horizon.app.core.openstack-service-api.glance',
      'horizon.app.core.openstack-service-api.policy',
      'horizon.framework.util.actions.action-result.service',
      'horizon.framework.util.i18n.gettext',
      'horizon.framework.util.q.extensions',
      'horizon.framework.widgets.modal.simple-modal.service',
      'horizon.framework.widgets.toast.service',
      'horizon.app.core.images.resourceType'
    ];
  
    /*
     * @ngdoc factory
     * @name horizon.app.core.images.actions.activate.action.service
     *
     * @Description
     * Brings up the activate images confirmation modal dialog.
  
     * On submit, activates a given image.
     * On cancel, do nothing.
     */
    function activateService(
      $q,
      glance,
      policy,
      actionResultService,
      gettext,
      $qExtensions,
      simpleModal,
      toast,
      imagesResourceType
    ) {
      var notAllowedMessage = gettext("You are not allowed to activate image");
  
      var service = {
        allowed: allowed,
        perform: perform
      };
  
      return service;
  
      //////////////
  
      function perform(items, newScope) {
        var scope = newScope;
        var context = { };
        var images = angular.isArray(items) ? items : [items];
        console.log(items)
        context.labels = labelize();
        context.deleteEntity = deleteImage;
        return $qExtensions.allSettled(images.map(checkPermission)).then(afterCheck);
  
        function checkPermission(image) {
          return {promise: allowed(image), context: image};
        }
  
        function afterCheck(result) {
          var outcome = $q.reject().catch(angular.noop);  // Reject the promise by default
          if (result.fail.length > 0) {
            toast.add('error', getMessage(notAllowedMessage, result.fail));
            outcome = $q.reject(result.fail).catch(angular.noop);
          }
          if (result.pass.length > 0) {
            outcome = simpleModal.modal(context.labels).result
            .then(function(){
            console.log("deactivating image", image)
                activateImage(image)
            });
          }
          return outcome;
        }
      }
  
      function allowed(image) {
        // only row actions pass in image
        // otherwise, assume it is a batch action
        if (image) {
          return $q.all([
            notProtected(image),
            policy.ifAllowed({ rules: [['image', 'delete_image']] }),
            notDeleted(image)
          ]);
        } else {
          return policy.ifAllowed({ rules: [['image', 'delete_image']] });
        }
      }
  
       function createResult(deleteModalResult) {
         // To make the result of this action generically useful, reformat the return
         // from the deleteModal into a standard form
         var actionResult = actionResultService.getActionResult();
         deleteModalResult.pass.forEach(function markDeleted(item) {
           actionResult.deleted(imagesResourceType, getEntity(item).id);
         });
         deleteModalResult.fail.forEach(function markFailed(item) {
           actionResult.failed(imagesResourceType, getEntity(item).id);
         });
         return actionResult.result;
       }
  
      function labelize() {
        return {
  
          title: gettext('Confirm Activate Image'),
  
          message: gettext('You have Activated image.'),
  
          submit: gettext('Activate Image'),
  
          success: gettext('Image was activated'),
  
          error: gettext('Unable to activate Image')
        };
      }
  
      function notDeleted(image) {
        return $qExtensions.booleanAsPromise(image.status !== 'deleted');
      }
  
      function notProtected(image) {
        return $qExtensions.booleanAsPromise(!image.protected);
      }

      function notActivated(image) {
        return $qExtensions.booleanAsPromise(!image.protected);
      }
  
      function activateImage(image) {
        return glance.reactivateImage(image);
      }
  
      function getMessage(message, entities) {
        return interpolate(message, [entities.map(getName).join(", ")]);
      }
  
      function getName(result) {
        return getEntity(result).name;
      }
  
      function getEntity(result) {
        return result.context;
      }

    }
  })();
  