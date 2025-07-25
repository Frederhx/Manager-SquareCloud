const { QRCodeStyling } = require('qr-code-styling-node/lib/qr-code-styling.common');
const canvas = require('canvas');

/**
 * @param {string} data - Dados para o QR Code (URL, texto, etc)
 * @param {string} imagePath - Caminho da imagem central (ex: logo)
 */

class qrGenerator {
    constructor({ imagePath }) {
        this.imagePath = imagePath;
    }

    generate = async function (data) {
        this.options = createOptions(data, this.imagePath);
        this.qrCodeImage = createQRCodeStyling(canvas, this.options);
        return await getRawData(this.qrCodeImage);
    }
}

function createOptions(data, image) {
    return {
        width: 1000,
        height: 1000,
        data,
        image,
        margin: 10,
        dotsOptions: {
            color: "#8e44ad", // Roxo
            type: "dots"
        },
        backgroundOptions: {
            color: "#ffffff" // Fundo branco
        },
        imageOptions: {
            crossOrigin: "anonymous",
            imageSize: 0.4,
            margin: 5
        },
        cornersDotOptions: {
            color: "#8e44ad", // Roxo nos cantos
            type: "dot"
        },
        cornersSquareOptions: {
            color: "#8e44ad", // Roxo nos quadrados dos cantos
            type: "extra-rounded"
        },
        cornersDotOptionsHelper: {
            color: "#8e44ad", // Fallback roxo nos cantos
            type: "extra-rounded"
        }
    };
}

function createQRCodeStyling(nodeCanvas, options) {
    return new QRCodeStyling({
        nodeCanvas,
        ...options
    });
}

async function getRawData(qrCodeImage) {
    return qrCodeImage.getRawData("png").then(r => {
        return {
            status: 'success',
            response: r.toString('base64')
        };
    }).catch(e => {
        return {
            status: 'error',
            response: e
        };
    });
}

module.exports.qrGenerator = qrGenerator;
