const ubs = require('usb');
const readline = require('node:readline');

const CONFIG = [
    {
        serialNumber: 'BG01THNA',
        configuration: 0,
        interface: 0,
        endpointNumber: 2,
        packetSize: 64,
    }    
]

const packetSize = 513;
let arrayBuffer = new ArrayBuffer(packetSize);
let view = new Uint8Array(arrayBuffer);
let shouldClose = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});




const webUSB = new ubs.WebUSB({
    // Bypass checking for authorised devices
    allowAllDevices: true
});

const listDevices =  async () => {
    return webUSB.getDevices()
}

const mainLoop = (device, endpointNumber) => {
    if(shouldClose) {
        device.releaseInterface()
        console.log("Closing device...")
        device.close()
        process.exit(0)
    }
    sendValue(device, endpointNumber, arrayBuffer)
    setTimeout(() => {
        mainLoop(device, endpointNumber)
    }, 30)
}

const sendValue = async (device, endpointNumber, arrayBuffer) => {
    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 4,
        value: 0x5008,
        index: 1,
    })

    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 4,
        value: 0x1008,
        index: 1,
    })
    
    await device.transferOut(endpointNumber, arrayBuffer)
}

const sendKeyBoardToDevice = async (device, endpointNumber, packetSize) => {
    rl.question(`Which value to you want to send?`, stringInput => {
        if(stringInput == "exit") {
            console.log("Done")
            rl.close();
            shouldClose = true;
            return
        }

        [sIndex, sValue] = stringInput.split(' ')
        index = parseInt(sIndex, 10)
        value = parseInt(sValue, 10)
        
        view[index] = value;    

        console.log(`Sending (Endpoint ${endpointNumber}):`)
        console.log(arrayBuffer)
        return sendKeyBoardToDevice(device, endpointNumber, packetSize)
        
    });
}

const main = async (device) => {
console.log(`\n\nUsing device: "${device.productName}"`)
    console.log(`\n\nOpening device..`)
    device.open()
    console.log(device)
    

    if (device.configuration === null) {
        await device.selectConfiguration(1);
    }
    console.log(`\n\nClaiming interface..`)

    const interface = await device.claimInterface(CONFIG[0].interface);

    console.log(device.configuration)


    const interfaceConfiguration = device.configurations[CONFIG[0].configuration].interfaces[CONFIG[0].interface].alternate
    console.log(interfaceConfiguration)
    const endpointOut = interfaceConfiguration.endpoints.filter(e => e.direction == 'out')[0]

    if (endpointOut === undefined) {
        throw 'No endpoint OUT found'
    }

    const packetSize = 513;

    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 0,
        value: 0x0000,
        index: 1,
    })
    
    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 3,
        value: 0x4138,
        index: 0,
    })

    await device.controlTransferIn({
        requestType: 'vendor',
        recipient: 'device',
        request: 10,
        value: 0x0000,
        index: 1,
    }, 1).then((d) => {
        console.log('transferInResponse', d)
    })    

    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 0,
        value: 0x0000,
        index: 1,
    })

    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 4,
        value: 0x1008,
        index: 1,
    })

    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 2,
        value: 0x0000,
        index: 1,
    })

    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 3,
        value: 0x000c,
        index: 0,
    })

    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 0,
        value: 0x0001,
        index: 1,
    })

    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 0,
        value: 0x0002,
        index: 1,
    })

    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: 1,
        value: 0x0200,
        index: 0x0001,
    })

    mainLoop(device, endpointOut.endpointNumber)
    sendKeyBoardToDevice()
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