z_nv=null;
z_th=new Array()
z_th[0]='HackTV Light'
z_th[1]='WebTV Dark'
z_th[2]='Avegee Red'
z_th[3]='Basic Web'
z_th[4]='WinXP Tan'
z_th[5]='Ryder Green'
z_th[6]='SKCro Blue'
z_th[7]='Win95 Teal'
z_th[8]='zefie Purple'
z_th[9]='MattMan Brown'
z_th[10]='Paper White'
z_th[11]='Halloween Black'

z_def=new Array()
z_def[0]=0//theme
	
chars="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@-"//64 possible different values
function gTN(th){return z_th[parseInt(th)]}
function pp(){d.write('<form name=z><input type=hidden name=h value=&pname;></form>');z_nv=d.z.h.value}
function gB(off){
	if(!z_nv){pp()}
	b=z_nv.charAt(parseInt(off))
	if(b){return chars.indexOf(b)}
	else{return -1}
}
function sB(off,dat,raw){
	if(!z_nv){pp()}
	off=parseInt(off)
	prefix=''
	if(off>0){prefix=z_nv.substring(0,off)}
	if(off>prefix.length){while(off!=prefix.length){prefix+='.'}}
	if(!raw){dat=chars.charAt(parseInt(dat));}
	z_url='client:ConfirmBYOISPSetup?BYOISPProviderName='+prefix+dat+z_nv.substring(off+1)
	go(z_url)
}
function eB(off){
	sB(off,'.',true)
}
function eAll(){
	z_url='client:ConfirmBYOISPSetup?BYOISPProviderName='
	go(z_url)
}
function gV(off){	
	off=parseInt(off)
	z_len=0
	switch(off){
		case 0:z_len=z_th.length
		break
	}
	z_val=gB(off)
	if(z_val<0||z_val>=z_len){return z_def[off]}
	return z_val
}
