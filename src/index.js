import request from 'request';
import dgram from 'dgram';
import {hsbToBin, brightnessToBin} from "./color";

const udpSocket = dgram.createSocket('udp4');
let Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-rgbwstrip", "RGBWStrip", RGBWStripAccessory);
};

class StripAPI {
    constructor(host, port) {
        this.host = host;
        this.port = port;
    }

    brightness = 0; // 0 - 100

    getOn = (callback) => {
        callback(null, this.brightness > 0);
    };

    setOn = (on, callback) => {
        this.brightness = on ? (this.brightness === 0 ? 60 : this.brightness) : 0;
        this.sendRGBWdelayed();
        callback(null);
    };

    getBrightness = (callback) => {
        callback(null, this.brightness);
    };

    setBrightness = (brightness, callback) => {
        this.stopFade();
        this.brightness = brightness;
        this.sendRGBWdelayed();
        callback(null);
    };

    sendRGBWdelayed = () => {
        if (this.sendTimeout) clearTimeout(this.sendTimeout);
        this.sendTimeout = setTimeout(() => {
            this.sendRGBW();
        }, 200);
    };

    sendRGBW = () => {
        const message = brightnessToBin(this.brightness / 100);
        udpSocket.send(message, 0, message.length, this.port, this.host, function(err, bytes) {
            if (err) throw err;
        });
    };

    stopFade = () => {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        this.fadeInterval = undefined;
    };

    setFadeOn = duration => (on, callback) => {
        if (!on) {
            this.stopFade();
            callback(null);
            return;
        }

        const targetBrightness = 80;
        const stepSize = 0.1;
        const interval = duration / targetBrightness * stepSize;

        this.brightness = 0;
        callback(null);

        this.fadeInterval = setInterval(() => {
            this.brightness += stepSize;
            this.sendRGBW();

            if (this.brightness >= targetBrightness) this.stopFade();
        }, interval);
    };

    getFadeOn = (callback) => {
        callback(null, this.fadeInterval !== undefined)
    };
}

class RGBWStripAccessory {

    constructor(platform, config) {
        this.name = config['name'];

        const service = new Service.Lightbulb(this.name);
        this.api = new StripAPI(config['host'], config['port']);

        service
            .getCharacteristic(Characteristic.Brightness)
            .on('get', this.api.getBrightness)
            .on('set', this.api.setBrightness);

        service
            .getCharacteristic(Characteristic.On)
            .on('get', this.api.getOn)
            .on('set', this.api.setOn);

        const morningService = new Service.Switch(`${this.name} fade`);

        morningService
            .getCharacteristic(Characteristic.On)
            .on('get', this.api.getFadeOn)
            .on('set', this.api.setFadeOn(300000));

        this.services = [ service, morningService ];
    }

    getServices() {
        return this.services;
    }
}
