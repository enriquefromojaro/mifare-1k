load('utils.js')

function travel(){
    amount = 80;
    var card  = new Card();
    var atr = card.reset(Card.RESET_COLD);
    try{
	var resp = card.loadDefaultAuthKeyInReader(0);
	if(resp.status !== '9000')
	    throw '[ERROR] Error loading default key in reader (position' + 0 + ') : ' + resp.status;
	
	var serial = card.getSerialNumber();
	if (serial.status === '9000')
	    serial = serial.data;
	else
	    throw '[ERROR] Error reading serial number: ' + serial.status;
	
	// Reading mac
	resp = card.authenticateSector(8);
	if (resp.status !== '9000')
	    throw '[ERRROR] Card error authenticating sector 8: ' + resp.status;
	var emitter = card.readBlock(8, 0, 16);
	if (emitter.status === '9000')
	    emitter = emitter.data.toString(ASCII).substring(0, 6);
	else
	    throw '[ERRROR] Card error reading emitter code from sector 8 block 0: '+ emitter.status;
	
	var cardMAC = card.readBlock(8, 1, 16, 16);
	if(cardMAC.status === '9000')
	    cardMAC = cardMAC.data;
	else
	    throw '[ERROR] Error reading card from card: ' + cardMAC.status;
	
	resp = card.authenticateSector(2);
	if(resp.status !== '9000')
	    throw '[ERROR] Error authenticating against sector 2: ' + resp.status;
	
	var credit = card.readValueBlock(2, 0);
	if(resp.status === '9000')
	    credit = credit.data.toUnsigned();
	else
	    throw '[ERROR] reading credit in sectro 2 block 0: ' + credit.status;
		
	var emissionDate = card.readBlock(2, 1, 16);
	if(emissionDate.status === '9000')
	    emissionDate = emissionDate.data.toString(ASCII);
	else
	    throw '[ERROR] reading credit in sectro 2 block 1: ' + emissionDate.status;
		
	var transAndPay = card.readBlock(2, 2, 16);
	if(transAndPay.status === '9000')
	    transAndPay = transAndPay.data.toString(ASCII);
	else
	    throw '[ERROR] Card error reading transport and pay method from in sector 2 block 2: ' + transAndPay.status;
	
	var transport = transAndPay.substring(0, 6);
	var payMethod = transAndPay.substring(6, 13);
	
	var mac = card.composeCalcAndFillMAC(credit, emissionDate, transport, payMethod, emitter, serial);
		
	if(!mac.equals(cardMAC))
	    throw 'Invalid MAC!!!! This card is not valid!!';
	print('MAC is correct!!');
	
	if(credit - amount < 0)
	    throw 'You have not credit enough! REcharge your card please';
	resp = card.decrement(2, 0, amount);
	if(resp.status !== '9000')
	    throw '[ERROR] Error incrementing credit in sector 2 block 0: ' + resp.status;
	
	credit-=amount;
	var mac = card.composeCalcAndFillMAC(credit, emissionDate, transport, payMethod, emitter, serial);
	
	//Authenticating with sector 8 to write the MAC
	resp = card.authenticateSector(8);
	if (resp.status !== '9000')
	    throw '[ERRROR] Card error authenticating sector 8: ' + resp.status;
	
	// Writing MAC
	resp = card.writeBlock(8, 1, mac);
	if (resp.status !== '9000')
	    throw '[ERROR] Error writing mac in sectro 8 block 1: ' + resp.status;
	
	
	// Writing travel info
	var busCode = new ByteString('B001', ASCII)
	var lineCode = new ByteString('L01', ASCII);
	// date in UNIX timestamp
	var now = ByteString.valueOf(Math.floor(new Date().getTime()/100));
	var stopCode = new ByteString('S426', ASCII);
	
	// the structure is
	// 3B     4B     5B    4B
	// line | bus | date | stop
	var travelInfo = lineCode.concat(busCode).concat(now).concat(stopCode);
	
	resp = card.increment(8, 2, 1);
	if(resp.status !== '9000')
	    throw '[ERROR] Error incrementing number of travels: ' + resp.status;
	var travelCounter = card.readValueBlock(8, 2);
	if(travelCounter.status === '9000')
	    travelCounter = travelCounter.data.toUnsigned() -1 ;
	else
	    throw '[ERROR] Error reading number of travels';
	
	var block = travelCounter%8 + Math.floor((travelCounter%8)/3);
	var logSector = 9 + Math.floor(block/4);
	var logBlock = block%4
	
	resp = card.authenticateSector(logSector);
	if(resp.status !== '9000')
	    throw '[ERROR] Error authenticating against sector ' + logSector + ': ' + resp.status;
	resp = card.writeBlock(logSector, logBlock, travelInfo);
	if(resp.status !== '9000')
	    throw '[ERROR] Error travel info for travel '+(travelCounter + 1)+' against sector ' + logSector + 'block '+logBlock+': ' + resp.status;
	
	print('Done. Have anice day! :)');
	
    }catch(err){
	print(err);
    }finally{
	card.close();
    }
    
}

travel();
