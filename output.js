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

const sendKeyBoardToDevice = async (device, endpointNumber, packetSize) => {
    rl.question(`Which value to you want to send?`, stringValue => {
        value = parseInt(stringValue, 10)
        
        if(value != 13) {
            let arrayBuffer = new ArrayBuffer(packetSize);
            let view = new Uint8Array(arrayBuffer);
            for(var i = 0; i < 64; i++) {
                view[i] = value;
            }
            

            console.log(`Sending (Endpoint ${endpointNumber}):`)
            console.log(arrayBuffer)
            device.transferOut(endpointNumber, arrayBuffer)
            return sendKeyBoardToDevice(device, endpointNumber, packetSize)
        }
        else {
            console.log("Done")
            rl.close();
            return
        }
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

    sendKeyBoardToDevice(device, endpointOut.endpointNumber, endpointOut.packetSize)
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