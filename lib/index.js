'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _color = require('./color');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var udpSocket = _dgram2.default.createSocket('udp4');
var Service = void 0,
    Characteristic = void 0;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-rgbwstrip", "RGBWStrip", RGBWStripAccessory);
};

var StripAPI = function StripAPI(host, port) {
    var _this = this;

    _classCallCheck(this, StripAPI);

    this.brightness = 0;

    this.getOn = function (callback) {
        callback(null, _this.brightness > 0);
    };

    this.setOn = function (on, callback) {
        _this.brightness = on ? _this.brightness === 0 ? 60 : _this.brightness : 0;
        _this.sendRGBWdelayed();
        callback(null);
    };

    this.getBrightness = function (callback) {
        callback(null, _this.brightness);
    };

    this.setBrightness = function (brightness, callback) {
        _this.stopFade();
        _this.brightness = brightness;
        _this.sendRGBWdelayed();
        callback(null);
    };

    this.sendRGBWdelayed = function () {
        if (_this.sendTimeout) clearTimeout(_this.sendTimeout);
        _this.sendTimeout = setTimeout(function () {
            _this.sendRGBW();
        }, 200);
    };

    this.sendRGBW = function () {
        var message = (0, _color.brightnessToBin)(_this.brightness / 100);
        udpSocket.send(message, 0, message.length, _this.port, _this.host, function (err, bytes) {
            if (err) throw err;
        });
    };

    this.stopFade = function () {
        if (_this.fadeInterval) clearInterval(_this.fadeInterval);
        _this.fadeInterval = undefined;
    };

    this.setFadeOn = function (duration) {
        return function (on, callback) {
            if (!on) {
                _this.stopFade();
                callback(null);
                return;
            }

            var targetBrightness = 80;
            var stepSize = 0.1;
            var interval = duration / targetBrightness * stepSize;

            _this.brightness = 0;
            callback(null);

            _this.fadeInterval = setInterval(function () {
                _this.brightness += stepSize;
                _this.sendRGBW();

                if (_this.brightness >= targetBrightness) _this.stopFade();
            }, interval);
        };
    };

    this.getFadeOn = function (callback) {
        callback(null, _this.fadeInterval !== undefined);
    };

    this.host = host;
    this.port = port;
} // 0 - 100

;

var RGBWStripAccessory = function () {
    function RGBWStripAccessory(platform, config) {
        _classCallCheck(this, RGBWStripAccessory);

        this.name = config['name'];

        var service = new Service.Lightbulb(this.name);
        this.api = new StripAPI(config['host'], config['port']);

        service.getCharacteristic(Characteristic.Brightness).on('get', this.api.getBrightness).on('set', this.api.setBrightness);

        service.getCharacteristic(Characteristic.On).on('get', this.api.getOn).on('set', this.api.setOn);

        var morningService = new Service.Switch(this.name + ' fade');

        morningService.getCharacteristic(Characteristic.On).on('get', this.api.getFadeOn).on('set', this.api.setFadeOn(300000));

        this.services = [service, morningService];
    }

    _createClass(RGBWStripAccessory, [{
        key: 'getServices',
        value: function getServices() {
            return this.services;
        }
    }]);

    return RGBWStripAccessory;
}();