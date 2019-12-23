(function(window) {
  var FUNCTION = 'function';
  var UNDEFINED = 'undefined';
  var subscribers = [];
  var webFrameId = null;
  var connectVersion = '1.7.1';
  var isWeb = typeof window !== UNDEFINED && !window.AndroidBridge && !window.webkit;
  var eventType = isWeb ? 'message' : 'VKWebAppEvent';

  if (typeof window !== UNDEFINED) {

    //polyfill
    if (!window.CustomEvent) {
      (function() {
        function CustomEvent(event, params) {
          params = params || {bubbles: false, cancelable: false, detail: undefined};
          var evt = document.createEvent('CustomEvent');
          evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
          return evt;
        };

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
      })();
    }

    window.addEventListener(eventType, function() {
      var args = Array.prototype.slice.call(arguments);
      var _subscribers = subscribers.slice();
      if (isWeb) {
        if (args[0].data.hasOwnProperty('webFrameId')) {
          delete args[0].data.webFrameId;
        }
        if (args[0].data.hasOwnProperty('connectVersion')) {
          delete args[0].data.connectVersion;
        }
        if (args[0].data.type && args[0].data.type === 'VKWebAppSettings') {
          webFrameId = args[0].data.frameId;
        } else {
          _subscribers.forEach(function(fn) {
            fn({
              detail: args[0].data
            });
          });
        }
      } else {
        _subscribers.forEach(function(fn) {
          fn.apply(null, args);
        });
      }
    });
  }

  window.connect = {
    /**
     * Отправляет сообщение нативному клиенту
     *
     * @example
     * message.send('VKWebAppInit');
     *
     * @param {String} handler Тип сообщения
     * @param {Object} params Данные сообщения
     * @returns {void}
     */
    send: function send(handler, params) {
      if (!params) {
        params = {};
      }

      var isClient = typeof window !== UNDEFINED;
      var androidBridge = isClient && window.AndroidBridge;
      var iosBridge = isClient && window.webkit && window.webkit.messageHandlers;
      var isDesktop = !androidBridge && !iosBridge;

      if (androidBridge && typeof androidBridge[handler] == FUNCTION) {
        androidBridge[handler](JSON.stringify(params));
      }
      if (iosBridge && iosBridge[handler] && typeof iosBridge[handler].postMessage == FUNCTION) {
        iosBridge[handler].postMessage(params);
      }

      if (isDesktop) {
        parent.postMessage({
          handler: handler,
          params: params,
          type: 'vk-connect',
          webFrameId: webFrameId,
          connectVersion
        }, '*');
      }
    },
    /**
     * Подписаться на VKWebAppEvent
     *
     * @param {Function} fn Обработчик события
     * @returns {void}
     */
    subscribe: function subscribe(fn) {
      subscribers.push(fn);
    },
    /**
     * Отписаться на VKWebAppEvent
     *
     * @param {Function} fn Обработчик события
     * @returns {void}
     */
    unsubscribe: function unsubscribe(fn) {
      var index = subscribers.indexOf(fn);

      if (index > -1) {
        subscribers.splice(index, 1);
      }
    },

    /**
     * Проверяет, поддерживает ли нативный клиент нандлер
     *
     * @param {String} handler Имя обработчика
     * @returns {boolean}
     */
    supports: function supports(handler) {

      var isClient = typeof window !== UNDEFINED;
      var androidBridge = isClient && window.AndroidBridge;
      var iosBridge = isClient && window.webkit && window.webkit.messageHandlers;
      var desktopEvents = [
        "VKWebAppInit",
        "VKWebAppGetCommunityAuthToken",
        "VKWebAppAddToCommunity",
        "VKWebAppGetUserInfo",
        "VKWebAppSetLocation",
        "VKWebAppGetClientVersion",
        "VKWebAppGetPhoneNumber",
        "VKWebAppGetEmail",
        "VKWebAppGetGeodata",
        "VKWebAppSetTitle",
        "VKWebAppGetAuthToken",
        "VKWebAppCallAPIMethod",
        "VKWebAppJoinGroup",
        "VKWebAppAllowMessagesFromGroup",
        "VKWebAppDenyNotifications",
        "VKWebAppAllowNotifications",
        "VKWebAppOpenPayForm",
        "VKWebAppOpenApp",
        "VKWebAppShare",
        "VKWebAppShowWallPostBox",
        "VKWebAppScroll",
        "VKWebAppResizeWindow",
      ];

      if (androidBridge && typeof androidBridge[handler] == FUNCTION) return true;

      if (iosBridge && iosBridge[handler] && typeof iosBridge[handler].postMessage == FUNCTION) return true;

      if (!iosBridge && !androidBridge && ~desktopEvents.indexOf(handler)) return true;

      return false;
    }
  };
})(window);

// ��� ���������� https://github.com/VKCOM/vkui-connect -----

connect.send('VKWebAppInit', {});
