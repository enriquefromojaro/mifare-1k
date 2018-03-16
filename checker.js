load('utils.js')
function check(){
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
	
	resp = card.authenticateSector(2);
	if(resp.status !== '9000')
	    throw '[ERROR] Error authenticating against sector 2: ' + resp.status;
	
	// Reading pocket with 150 euros
	var credit = card.readValueBlock(2, 0);
	if(resp.status === '9000')
	    credit = credit.data.toUnsigned()/100;
	else
	    throw '[ERROR] reading credit in sectro 2 block 0: ' + credit.status;
	
	print('Credit: ' + credit + ' euros');
	
	var emissionDate = card.readBlock(2, 1, 16);
	if(emissionDate.status === '9000')
	    emissionDate = emissionDate.data.toString(ASCII);
	else
	    throw '[ERROR] reading credit in sectro 2 block 1: ' + emissionDate.status;
	
	print('Emision date: ' + emissionDate);
	
	var transAndPay = card.readBlock(2, 2, 16);
	if(transAndPay.status === '9000')
	    transAndPay = transAndPay.data.toString(ASCII);
	else
	    throw '[ERROR] Card error reading transport and pay method from in sector 2 block 2: ' + transAndPay.status;
	
	var transport = transAndPay.substring(0, 6);
	var payMethod = transAndPay.substring(6, 13);
	print('Transport type: ' + transport + '\nPayment method: ' + payMethod);
	
	// Reading mac
	resp = card.authenticateSector(8);
	if (resp.status !== '9000')
	    throw '[ERRROR] Card error authenticating sector 8: ' + resp.status;
	var emitter = card.readBlock(8, 0, 16);
	if (emitter.status === '9000')
	    emitter = emitter.data.toString(ASCII).substring(0, 6);
	else
	    throw '[ERRROR] Card error reading emitter code from sector 8 block 0: '+ emitter.status;
	
	print('Emitter code: '+emitter);
	var cardMAC = card.readBlock(8, 1, 16, 16);
	if(cardMAC.status === '9000')
	    cardMAC = cardMAC.data;
	else
	    throw '[ERROR] Error reading card from card: ' + cardMAC.status;
	
	// for a max value of 15000, we need 2 bytes
	credit = Math.floor(credit*100);
	
	var mac = card.composeCalcAndFillMAC(credit, emissionDate, transport, payMethod, emitter, serial);
	
	if(!mac.equals(cardMAC))
	    throw 'Invalid MAC!!!! This card is not valid!!'
	
    }catch(err){
	print(err);
    }finally{
	card.close();
    }
    
}

check();