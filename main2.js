var JZZ = require('jzz');

JZZ().openMidiIn().or('Cannot open MIDI In port!')
     .and(function() { console.log('MIDI-In: ', this.name()); })
     .connect(function(msg) { console.log(msg.toString()); })
     .wait(10000).close();