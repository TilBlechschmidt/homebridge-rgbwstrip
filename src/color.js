const gamma = [
    0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,
    1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,
    2,  3,  3,  3,  3,  3,  3,  3,  4,  4,  4,  4,  4,  5,  5,  5,
    5,  6,  6,  6,  6,  7,  7,  7,  7,  8,  8,  8,  9,  9,  9, 10,
    10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16,
    17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 24, 24, 25,
    25, 26, 27, 27, 28, 29, 29, 30, 31, 32, 32, 33, 34, 35, 35, 36,
    37, 38, 39, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 50,
    51, 52, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 66, 67, 68,
    69, 70, 72, 73, 74, 75, 77, 78, 79, 81, 82, 83, 85, 86, 87, 89,
    90, 92, 93, 95, 96, 98, 99,101,102,104,105,107,109,110,112,114,
    115,117,119,120,122,124,126,127,129,131,133,135,137,138,140,142,
    144,146,148,150,152,154,156,158,160,162,164,167,169,171,173,175,
    177,180,182,184,186,189,191,193,196,198,200,203,205,208,210,213,
    215,218,220,223,225,228,231,233,236,239,241,244,247,249,252,255 ];

function clamp(x, min, max) {

    if (x < min) {
        return min;
    }
    if (x > max) {
        return max;
    }

    return x;

}

export function hsbToBin(hue, saturation, brightness) {
    const buf = new ArrayBuffer(4);
    const dv = new DataView(buf);

    const { r, g, b, w } = gammaCorrectRGBW(hsbToRGBW(hue, saturation, brightness));
    dv.setUint8(0, r);
    dv.setUint8(1, g);
    dv.setUint8(2, b);
    dv.setUint8(3, w);

    return Buffer.from(buf);
}

export function gammaCorrectRGBW(color) {
    return {
        r: gamma[color.r],
        g: gamma[color.g],
        b: gamma[color.b],
        w: gamma[color.w],
    }
}

export function hsbToRGBW(hue, saturation, brightness) {
    // Convert saturation and brightness to float percentages
    saturation = saturation / 100;
    brightness = brightness / 100;

    let r, g, b, w;
    let cosH, cos1047H;
    hue = hue % 360; // wrap around 0-360º
    hue = 3.14159 * hue / 180; // convert to radians
    saturation = clamp(saturation, 0, 1); // saturation > 0 ? (saturation < 1 ? saturation : 1) : 0; // clamp to [0,1]
    brightness = clamp(brightness, 0, 1); // brightness > 0 ? (brightness < 1 ? brightness : 1) : 0; // clamp to [0,1]

    if (hue < 2.09439) {
        cosH = Math.cos(hue);
        cos1047H = Math.cos(1.047196667 - hue);
        r = saturation * 255 * brightness / 3 * (1 + cosH / cos1047H);
        g = saturation * 255 * brightness / 3 * (1 + (1 - cosH / cos1047H));
        b = 0;
        w = 255 * (1 - saturation) * brightness;
    } else if (hue < 4.188787) {
        hue = hue - 2.09439;
        cosH = Math.cos(hue);
        cos1047H = Math.cos(1.047196667 - hue);
        g = saturation * 255 * brightness / 3 * (1 + cosH / cos1047H);
        b = saturation * 255 * brightness / 3 * (1 + (1 - cosH / cos1047H));
        r = 0;
        w = 255 * (1 - saturation) * brightness;
    } else {
        hue = hue - 4.188787;
        cosH = Math.cos(hue);
        cos1047H = Math.cos(1.047196667 - hue);
        b = saturation * 255 * brightness / 3 * (1 + cosH / cos1047H);
        r = saturation * 255 * brightness / 3 * (1 + (1 - cosH / cos1047H));
        g = 0;
        w = 255 * (1 - saturation) * brightness;
    }

    return { r, g, b, w }
}

export function rgbToRGBW(rgb, brightness) {
    const Ri = rgb.r
    const Gi = rgb.g
    const Bi = rgb.b

    const Wo = Math.min(Ri, Gi, Bi)
    const Ro = Ri - Wo
    const Go = Gi - Wo
    const Bo = Bi - Wo

    return {
        r: Math.round(Ro * brightness),
        g: Math.round(Go * brightness),
        b: Math.round(Bo * brightness),
        w: Math.round(Wo * brightness)
    }
}

export function colorTemperatureToRGB(kelvin) {
    const temperature = kelvin / 100
    let red = 0, green = 0, blue = 0

    // Red
    if (temperature < 66) {
        red = 255
    } else {
        red = temperature - 55
        red = 351.97690566805693+ 0.114206453784165 * red - 40.25366309332127 * Math.log(red)
        red = clamp(red, 0, 255)
    }

    // Green
    if (temperature < 66) {
        green = temperature - 2
        green = -155.25485562709179 - 0.44596950469579133 * green + 104.49216199393888 * Math.log(green)
    } else {
        green = temperature - 50.0
        green = 325.4494125711974 + 0.07943456536662342 * green - 28.0852963507957 * Math.log(green)
    }
    
    green = clamp(green, 0, 255)

    // Blue
    if (temperature >= 66) {
        blue = 255
    } else if (temperature < 20) {
        blue = 0
    } else {
        blue = temperature - 10
        blue = -254.76935184120902 + 0.8274096064007395 * blue + 115.67994401066147 * Math.log(blue)
        blue = clamp(blue, 0, 255)
    }

    return {
        r: red,
        g: green,
        b: blue
    }
}

export function colorTemperatureToBin(kelvin, brightness) {
    const buf = new ArrayBuffer(4);
    const dv = new DataView(buf);

    const rgb = colorTemperatureToRGB(kelvin)
    const rgbw = rgbToRGBW(rgb, brightness)
    
    const { r, g, b, w } = rgbw // gammaCorrectRGBW(rgbw)
    dv.setUint8(0, r)
    dv.setUint8(1, g)
    dv.setUint8(2, b)
    dv.setUint8(3, w)

    return Buffer.from(buf)
}

export function brightnessToBin(b) {
    const maxKelvin = 10000
    const brightness = Math.min(Math.pow(2 * b, 2), 1)
    const kelvin = Math.max(Math.pow(b, 3) * maxKelvin, 300)
    return colorTemperatureToBin(kelvin, brightness)
}
