load('utils.js')
function emit(credit, transport, payMethod){
    
    var transCodes = {bus: 'EMTBUS', metro: 'METROM', train: 'CERCAN' }; //6 bytes long
    var payCodes = {debit_card: 'DEBCARD', credit_card: 'CRECARD', cash:'$CASH$$'}; // 7 bytes long
    
    transport = transCodes[transport];
    payMethod = payCodes[payMethod];
    
    if (! transport)
	throw 'In valid transport option!!';
    if (! transport)
	throw 'In valid pay method!!';
    if (credit > 150)
	throw 'Credit must be 150 euros or less!!';
    credit = Math.floor(credit * 100);
    
    var emitterCode = 'EM0001';
    var card  = new Card();
    var atr = card.reset(Card.RESET_COLD);
    try{
	var resp = card.loadDefaultAuthKeyInReader(0);
	if(resp.status !== '9000')
	    throw '[ERROR] Error loading default key in reader (position' + i + ') : ' + resp.status;
	
	var serial = card.getSerialNumber();
	if (serial.status === '9000')
	    serial = serial.data;
	else
	    throw '[ERROR] Error reading serial number: ' + serial.status;
	
	resp = card.authenticateSector(2);
	if(resp.status !== '9000')
	    throw '[ERROR] Error authenticating against sector 2: ' + resp.status;
	
	// Setting pocket with 150 euros
	resp = card.setAsValueBlock(2, 0, credit);
	if(resp.status !== '9000')
	    throw '[ERROR] writing pocket info in sectro 2 block 0: ' + resp.status;
	
	// writing date
	var today = new Date();
	today = Utils.time.formatDate(today, '%Y-%m-%d %H:%M');
	resp = card.writeBlock(2, 1, new ByteString(today, ASCII));
	if (resp.status !== '9000')
	    throw '[ERROR] Error writing date in sectro 2 block 1: ' + resp.status;
	
	// writing transport code and payment method
	resp = card.writeBlock(2, 2, new ByteString(transport+payMethod+'PPP', ASCII));
	if (resp.status !== '9000')
	    throw '[ERROR] Error writing transport code and mayment method in sectro 0 block 2: ' + resp.status;
	
	
	resp = card.authenticateSector(8);
	if(resp.status !== '9000')
	    throw '[ERROR] Error authenticating against sector 8: ' + resp.status;
	
	// Writing emitter code (6 bytes)
	resp = card.writeBlock(8, 0, new ByteString(emitterCode + 'PPPPPPPPPP', ASCII));
	if (resp.status !== '9000')
	    throw '[ERROR] Error writing emitter code in sectro 8 block 0: ' + resp.status;
	
	// for a max value of 15000, we need 2 bytes
	var mac = card.composeCalcAndFillMAC(credit, today, transport, payMethod, emitterCode, serial)
	
	// writing MAC
	resp = card.writeBlock(8, 1, mac);
	if (resp.status !== '9000')
	    throw '[ERROR] Error writing mac in sectro 8 block 1: ' + resp.status;
	
	print('Card emitted!!! You can take it now');
	
    }catch(err){
	print(err);
    }finally{
	card.close();
    }
    
}

emit(80, 'bus', 'debit_card');