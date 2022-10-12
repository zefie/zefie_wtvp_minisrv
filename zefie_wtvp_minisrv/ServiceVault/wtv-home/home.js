var minisrv_service_file = true;


if (request_headers.query.url) {
	headers = `300 OK
Location: ${request_headers.query.url}`;
} else {
	headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-home:/splash
wtv-expire-all: wtv-flashrom:
Content-type: text/html`
	var cryptstatus = (wtv_encrypted ? "Encrypted" : "Not Encrypted")

	var comp_type = wtvmime.shouldWeCompress(session_data, 'text/html');
	var compstatus = "uncompressed";
	switch (comp_type) {
		case 1:
			compstatus = "wtv-lzpf";
			break;
		case 2:
			compstatus = "gzip (level 9)";
			break;
	}

	var unread_mailcount = session_data.mailstore.countUnreadMessages(0)
	var mailbox_gif_num = 0; // no messages
	if (unread_mailcount > 0) {
		if (unread_mailcount == 1) mailbox_gif_num = 1;
		else mailbox_gif_num = 2;
	}


	data = `<HTML>
	<HEAD>

		<TITLE>Home for ${session_data.getSessionData("subscriber_username") || "minisrv"}</TITLE>
		<DISPLAY noscroll fontsize="medium">
	</HEAD>

	<body background="wtv-home:/images/BackgroundGradient.gif" text="44cc55" link="6977a9" vlink="6977a9" hspace=0 vspace=0 >

	<sidebar width=138>
		<table cellspacing=0 cellpadding=0 bgcolor="30364D">
			<!-- BEGIN LOGO SPAN -->
			<tr>
				<td width=138 absheight=112 valign=top align=center>
					<img src="file://rom/Images/Spacer.gif" width=1 height=9><br>

					<a HREF="client:showservices">
						<img src="file://rom/Images/Spacer.gif" width=1 height=2>
						<img src="${minisrv_config.config.service_logo}"" width=127 height=98>
					</A>

			<!-- BEGIN SEPARATOR -->
			<tr>
				<td absheight=5>
					<table cellspacing=0 cellpadding=0>
						<tr>
							<td abswidth=138 absheight=2 valign=middle align=center bgcolor="1C1E28">
								<img src="file://rom/Images/Spacer.gif" width=1 height=1>
						<tr>
							<td abswidth=138 absheight=1 valign=top align=left>
						<tr>
							<td abswidth=138 absheight=2 valign=top align=left bgcolor="4D5573">
								<img src="file://rom/Images/Spacer.gif" width=1 height=1>
					</table>
			<!-- END LOGO SPAN -->

			<!-- BEGIN SPAN -->
			<tr>
				<td absheight=25>
					<table cellspacing=0 cellpadding=0>
						<tr>
							<td height=2>
						<tr>
							<td abswidth=7>
							<td abswidth=125>
								<table cellspacing=0 cellpadding=0 href="client:relogin">
									<tr>
										<td>
											<table cellspacing=0 cellpadding=0>
												<tr>
													<td>
														<shadow><font size=3 color=e7ce4a>Login</font></shadow>
											</table>
								</table>
							<td abswidth=6>
					</table>

			<!-- BEGIN SEPARATOR -->
			<tr>
				<td absheight=5>
					<table cellspacing=0 cellpadding=0>
						<tr>
							<td abswidth=138 absheight=2 valign=middle align=center bgcolor="1C1E28">
								<img src="file://rom/Images/Spacer.gif" width=1 height=1>
						<tr>
							<td abswidth=138 absheight=1 valign=top align=left>
						<tr>
							<td abswidth=138 absheight=2 valign=top align=left bgcolor="4D5573">
								<img src="file://rom/Images/Spacer.gif" width=1 height=1>
					</table>
			<!-- END SPAN -->

			<!-- BEGIN SPAN -->
			<tr>
				<td absheight=25>
					<table cellspacing=0 cellpadding=0>
						<tr>
							<td height=2>
						<tr>
							<td abswidth=7>
							<td abswidth=125>


								<table cellspacing=0 cellpadding=0 href="wtv-setup:/setup">
									<tr>
										<td>
											<table cellspacing=0 cellpadding=0>
												<tr>
													<td>
														<shadow><font size=3 color=e7ce4a>Setup</font></shadow>
											</table>
								</table>
							<td abswidth=6>
					</table>

			<!-- BEGIN SEPARATOR -->
			<tr>
				<td absheight=5>
					<table cellspacing=0 cellpadding=0>
						<tr>
							<td abswidth=138 absheight=2 valign=middle align=center bgcolor="1C1E28">
								<img src="file://rom/Images/Spacer.gif" width=1 height=1>
						<tr>
							<td abswidth=138 absheight=1 valign=top align=left>
						<tr>
							<td abswidth=138 absheight=2 valign=top align=left bgcolor="4D5573">
								<img src="file://rom/Images/Spacer.gif" width=1 height=1>
					</table>
			<!-- END SPAN -->


			<!-- BEGIN SPAN -->
			<tr>
				<td absheight=25>
					<table cellspacing=0 cellpadding=0>
						<tr>
							<td height=2>
						<tr>
							<td abswidth=7>
							<td abswidth=125>

							<table cellspacing=0 cellpadding=0 href="wtv-news:/lobby">
								<tr>
									<td>
										<table cellspacing=0 cellpadding=0>
											<tr>
												<td>
													<shadow><font size=3 color=e7ce4a>Discuss</font></shadow>
										</table>
							</table>

							<td abswidth=6>
					</table>

			<!-- BEGIN SEPARATOR -->


			<!-- BEGIN SEPARATOR -->
			<tr>
				<td absheight=5>
					<table cellspacing=0 cellpadding=0>
						<tr>
							<td abswidth=138 absheight=2 valign=middle align=center bgcolor="1C1E28">
								<img src="file://rom/Images/Spacer.gif" width=1 height=1>
						<tr>
							<td abswidth=138 absheight=1 valign=top align=left>
						<tr>
							<td abswidth=138 absheight=2 valign=top align=left bgcolor="4D5573">
								<img src="file://rom/Images/Spacer.gif" width=1 height=1>
					</table>
			<!-- END SPAN -->

`;
	data += `
			<!-- BEGIN SPAN -->
			<tr>
				<td absheight=25>
					<table cellspacing=0 cellpadding=0>
						<tr>
							<td height=2>
						<tr>
							<td abswidth=7>
							<td abswidth=125>

							<table cellspacing=0 cellpadding=0 href="wtv-guide:/help?topic=Index&subtopic=Glossary">
								<tr>
									<td>
										<table cellspacing=0 cellpadding=0>
											<tr>
												<td>
													<shadow><font size=3 color=e7ce4a>Help</font> <font size=-2 color=e7ce4a><sup>(WIP)</sup></font></shadow>
										</table>
							</table>

							<td abswidth=6>
					</table>

			<!-- BEGIN SEPARATOR -->
			<tr>
				<td absheight=5>

					<table cellspacing=0 cellpadding=0>
						<tr>
							<td abswidth=138 absheight=2 valign=middle align=center bgcolor="1C1E28">
								<img src="file://rom/Images/Spacer.gif" width=1 height=1>
						<tr>
							<td abswidth=138 absheight=1 valign=top align=left>
						<tr>
							<td abswidth=138 absheight=2 valign=top align=left bgcolor="4D5573">
							<img src="file://rom/Images/Spacer.gif" width=1 height=1>
					</table>
			<!-- END SPAN -->

			<!-- ADJUST ME FOR HOME TEXT HEIGHT -->
			<tr>
				<td absheight=28>

			<tr>
				<td align=right>
					<img src="wtv-home:/images/HomeBanner.gif" width=48 height=126>

			<tr>
			<td absheight=5>

		</table>
	</sidebar>


		<table cellspacing=0 cellpadding=0 width=100% height=383>
			<tr>
				<td rowspan=10 background="wtv-home:/images/BackgroundGradientEdge.gif" width=6 height=100%>

			<tr>
				<td valign=top absheight=113>
					<table cellspacing=0 cellpadding=0 width=100%>
						<tr>
							<!-- BEGIN ICON #1 -->
							<td width=9%>
							<td absheight=113 width=18%>
								<LINK REL=next HREF="wtv-mail:/listmail">
								<table cellspacing=0 cellpadding=0 border=0 href="wtv-mail:/listmail" selected nocolor width=100%>
									<tr>
										<td height=10>
									<tr>
										<td align=center>
											<img src="file://ROMCache/OpenMailbox${mailbox_gif_num}.gif" border=0 width=61 height=52>
									<tr>
										<td height=4>
									<tr>
										<td valign=bottom>
											<table cellspacing=0 cellpadding=0 width=100%>
												<tr>
													<td align=center>
														<font size=3 color=#000000>Mail</font>	
											</table>
								</table>
							
							<!-- BEGIN ICON #2 -->
							<td width=6%>
							<td absheight=113 width=22%>
								<table cellspacing=0 cellpadding=0 border=0 href="wtv-favorite:/favorite" nocolor>
									<tr>
										<td height=12>
									<tr>
										<td align=center>
											<img src="file://ROMCache/TreasureChest1.gif" border=0 width=92 height=52>
									<tr>
										<td height=2>
									<tr>
										<td valign=bottom>
											<table cellspacing=0 cellpadding=0 width=100%>
												<tr>
													<td align=center>
														<font size=3 color=#000000>Favorites</font>
											</table>
								</table>
							
							<!-- BEGIN ICON #3 -->
							<td width=5%>
							<td absheight=113 width=19%>
								<table cellspacing=0 cellpadding=0 border=0 href="wtv-flashrom:/willie" nocolor>
									<tr>
										<td height=5>
									<tr>
										<td align=center>
											<img src="wtv-home:/images/rom.gif" border=0 width=68 height=59>
									<tr>
										<td height=2>
									<tr>
										<td valign=bottom>
											<table cellspacing=0 cellpadding=0 width=100%>
												<tr>
													<td align=center>
														<font size=3 color=#000000>Flashroms</font>
											</table>
								</table>

							<!-- BEGIN ICON #4 -->
							<td absheight=113 width=3%>
							<td absheight=113 width=20%>
								<table cellspacing=0 cellpadding=0 border=0 href="http://duckduckgo.com/lite/" nocolor>
									<tr>
										<td height=12>
									<tr>
										<td align=center>
											<img src="file://ROMCache/Binoculars0.gif" border=0 width=80 height=51>
									<tr>
										<td height=2>
									<tr>
										<td valign=bottom>
											<table cellspacing=0 cellpadding=0 width=100%>
												<tr>
													<td align=center>
														<font size=3 color=#000000>Search</font>
											</table>
								</table>
							<td width=9%>
					</table>

				<tr>
					<td valign=middle align=center>						
						<!-- BEGIN MAIN SUB-CONTENT AREA -->
						<table cellspacing=0 cellpadding=0 width=480>						
							<tr>
								<td abswidth=100% absheight=18 align=center>
<font size="2"><b>Welcome to ${minisrv_config.config.service_name}`;
	if (session_data.getSessionData("registered")) data += ", " + session_data.getSessionData("subscriber_username") + "!";
	data += `</font></b>
<tr>
<td width=100% align=center absheight=2 bgcolor="000000">
<tr>
<td abswidth=100% absheight=16 valign=middle align=center>
<font size="small"><b>Status</b>: ${cryptstatus} (${compstatus})</font>
<tr>
<td width=100% align=center absheight=2 bgcolor="000000">
<tr>
<td abswidth=100% absheight=150 valign=top align=left>
 <br>
 <h4>&nbsp; Main Menu</h4>
<ul>
<font size="2"><li><a href="wtv-admin:/admin">wtv-admin</a> <sup>new!</sup></li>
`;
	if (session_data.hasCap("client-can-do-chat")) {
		data += "<li><a href=\"wtv-chat:/home\">IRC Chat Test</a></li>\n"
	}
	if (session_data.hasCap("client-has-disk")) {
		// only show disk stuff if client has disk
		data += "<li><a href=\"client:diskhax\">DiskHax</a> ~ <a href=\"client:vfathax\">VFatHax</a></li>\n";
		if (session_data.hasCap("client-can-do-macromedia-flash2")) {
			// only show demo if client can do flash2
			data += "<li>Old DealerDemo: <a href=\"wtv-disk:/sync?group=DealerDemo&diskmap=DealerDemo\">Download</a> ~ <a href=\"file://Disk/Demo/index.html\">Access</a></li>\n";
		}
	}
	data += `</ul></font>`;
	// for development
	if (fs.existsSync(service_vaults[0] + "/" + service_name + "/home.zefie.html")) {
		data += fs.readFileSync(service_vaults[0] + "/" + service_name + "/home.zefie.html", { 'encoding': 'utf8' });
	}
	data += `</table>
<tr>
<td width=100% absheight=28>
<tr>
<td width=100% align=center absheight=2 bgcolor="000000">
<tr>
<td width=100% align=center absheight=22>
<font size="-4"><b>Connection Speed</b>: &rate;</font>
<tr>
<td width=100% align=center absheight=2 bgcolor="000000">
<tr>
<td width=100% align=right absheight=20>
<font size="-4"><i>minisrv v${minisrv_config.version}${(minisrv_config.config.git_commit) ? ' git-' + minisrv_config.config.git_commit : ''}, hosted by ${minisrv_config.config.service_owner}</i></small></font> &nbsp; <br>
<tr>
<td width=100% align=center absheight=2 bgcolor="000000">

</table>
</table>
</body>
</html>`
}