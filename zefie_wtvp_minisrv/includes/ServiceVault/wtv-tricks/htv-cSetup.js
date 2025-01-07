function uI(ip,prt,dsc,ro){
	if(!ro){ro=false}
	d.c.machine.value=ip
	d.c.port.value=prt
	d.i.msg.value=dsc
	d.c.machine.readonly=ro
	d.c.port.readonly=ro
}

function uS(){switch(d.c.p[d.c.p.selectedIndex].value){
	case "htv":uI("71.244.121.234","1615","This is the public HackTV minisrv, all are welcome to connect and enjoy the wonders of WebTV. Custom experience, including updates to HackTV builds!",true)
	break
	case "htvb":uI("71.244.121.234","1415","This is the public HackTV minisrv backup, only available when the main HackTV server is down.",true)
	break
	case "zef": uI("216.126.232.171","1615","zefie's public minisrv, for those who want an experience close to the vanilla minisrv.",true)
	break
	case "mm69":uI("71.244.121.234","1515","MattMan's megasrv. It's the real deal, not minisrv! May be up from time to time.",true)
	break
	case "jar":uI("217.160.150.209","1615","WebTV Redialed aims to replicate the look and feel of the original production WebTV service.",true)
	break
	case "zlan":uI("192.168.11.8","1615","zefie's Desktop via LAN.",false)
	break
	case "zlan2":uI("192.168.11.95","1615","zefie's public minisrv via LAN.",false)
	break
	case "other":uI("","1615","Your custom service.",false)
	break
}}
