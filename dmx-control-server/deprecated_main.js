const ubs = require('usb');

const CONFIG = [
    {
        serialNumber: 'BG01THNA',
        configuration: 0,
        interfaces: 0,
        endpointNumber: 2,
        packetSize: 64,
    }    
]



const webUSB = new ubs.WebUSB({
    // Bypass checking for authorised devices
    allowAllDevices: true
});

const listDevices =  async () => {
    return webUSB.getDevices()
}

const main = async (device) => {
console.log(`\n\NUsing device: "${device.productName}"`)
    console.log(device)
    console.log(device.configuration.interfaces[0].alternate)

    return
    console.log(`\n\nOpening device..`)
    device.open()
    console.log(device)
    

    if (device.configuration === null) {
        await device.selectConfiguration(1);
    }
    console.log(`\n\nClaiming interface..`)

    const configurationIndex = 0
    const interfaceIndex = 1
    const interface = await device.claimInterface(interfaceIndex);


    device.configurations[configurationIndex].interfaces[interfaceIndex].alternate
    const interfaceConfiguration = device.configurations[configurationIndex].interfaces[interfaceIndex].alternate
    const endpointIn = interfaceConfiguration.endpoints.filter(e => e.direction == 'in')[0]

    if (endpointIn === undefined) {
        throw 'No endpoint IN found'
    }


    const moveMapping = {
        2448: 'Key Down       ',
        2176: 'Key Up         ',
        2992: 'Potentiometer  ',
        3808: 'Bender         '
    }

    const keys = [
        'C',
        'C#',
        'D',
        'D#',
        'E',
        'F',
        'F#',
        'G',
        'G#',
        'A',
        'A#',
        'B'
    ]
    const keyName = (move, key) => {
        if(move != 2448 && move != 2176) {
            return key
        }
        return `${keys[key % keys.length]}${(Math.floor(key / keys.length))}`
    }
    while (true) {
        let result = await device.transferIn(endpointIn.endpointNumber, endpointIn.packetSize)
        const move = result.data.getUint16(0);
        const key = result.data.getUint8(2);
        const intensity = result.data.getUint8(3);

        
        console.log(moveMapping[move], keyName(move, key), intensity)
    }
    return

    device.releaseInterface()
    device.close()

    while (true) {
        let result = await device.transferIn(1, 6);

        if (result.data && result.data.byteLength === 6) {
            console.log('Channel 1: ' + result.data.getUint16(0));
            console.log('Channel 2: ' + result.data.getUint16(2));
            console.log('Channel 5: ' + result.data.getUint16(4));
        }

        if (result.status === 'stall') {
            console.warn('Endpoint stalled. Clearing.');
            await device.clearHalt(1);
        }
    }
}

(async () => {
    console.log("Initializing...")
    const devices = await listDevices()
    if(devices.length <= 0) {
        console.log("No USB device connected")
        return
    }
    const device = devices[0]

    main(device).then(() => {
      console.log("Done")  
    }).catch((error) => {
        console.log("Error")
        console.log("Releasing interface...")
        device.releaseInterface()
        console.log("Closing device...")
        device.close()
        console.log("\n\n")
        console.log(error)
    })
})()

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}