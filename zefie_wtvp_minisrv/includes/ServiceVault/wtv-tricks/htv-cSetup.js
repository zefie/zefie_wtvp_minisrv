var d = document;

function uI(ip,prt,dsc,ro,rb){
	if(!ro){ro=false}
	d.c.machine.value=ip
	d.c.port.value=prt
	d.i.msg.value=dsc
	d.i.runBy.value=rb
	d.c.machine.readonly=ro
	d.c.port.readonly=ro
}

function uS(){
	switch(d.c.p[d.c.p.selectedIndex].value){
		case "htv":uI("71.244.121.234","1615","The public HackTV minisrv, all are welcome to connect and enjoy the wonders of WebTV. Custom experience, but simulates the WebTV network after its MSN TV rebrand.",true, "MattMan69")
		break
		case "htvb":uI("71.244.121.234","1415","The HackTV minisrv backup server, only available when the main HackTV server is down.",true, "MattMan69")
		break
		case "zef": uI("204.11.163.156","1615","zefie's public minisrv, for those who want the vanilla minisrv experience. For more info, see https://zef.pw/minisrv.",true, "zefie")
		break
		case "mm69":uI("71.244.121.234","1515","MattMan's megasrv. It's the real deal, not minisrv! May be up from time to time.",true, "MattMan69")
		break
		case "red":uI("31.97.129.116","1615","WThe WebTV Redialed minisrv, for those who want an original WebTV experience. Simulates the WebTV Network as it was in 1999.",true, "HIDEN")
		break
		case "local":uI("127.0.0.1","1615","Connects to a server running on your local machine. Doesn't do anything if a server isn't running.",true, "You")
		break
		case "other":uI("","1615","Enter a custom service.",false, "???")
		break
	}
}
