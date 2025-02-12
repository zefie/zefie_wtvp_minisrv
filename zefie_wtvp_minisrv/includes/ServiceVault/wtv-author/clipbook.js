var minisrv_service_file = true;

const docName = request_headers.query.docName
const blockNum = request_headers.query.blockNum
const blockClass = request_headers.query.blockClass
const category = request_headers.query.mediaCategoryID ? parseInt(request_headers.query.mediaCategoryID) : null;
var page = request_headers.query.pageNum ? parseInt(request_headers.query.pageNum) : 0;
const itemsPerPage = 12;

const clipart = {
	0: {
		"name": "Animals",
		"categories": [
			[1, "Birds & Bees"],
			[2, "Cats & Dogs"],
			[3, "Farm Animals"],
			[4, "Fish & Sealife"],
			[5, "Horses"],
			[6, "Insects & Reptiles"],
			[7, "Prehistoric"],
			[8, "Wildlife"]
		]
	},
	1: {
		"name": "Birds & Bees",
		"parent": "Animals",
        "path": "Animals/Birds_n_Bees",
		"images": [
			"an00210_.gif", "an00211_.gif", "an00212_.gif", "an00213_.gif", "an00214_.gif",
			"an00221_.gif", "an00222_.gif", "an00223_.gif", "an00224_.gif", "an00225_.gif",
			"an00226_.gif", "an00229_.gif", "an00230_.gif", "an00235_.gif", "an00236_.gif",
			"an00237_.gif", "an00238_.gif", "an00239_.gif", "an00240_.gif", "an00247_.gif",
			"an00248_.gif", "an00249_.gif", "an00255_.gif", "an00257_.gif", "an00258_.gif",
			"an00262_.gif", "an00296_.gif", "an00306_.gif", "an00307_.gif", "an00308_.gif",
			"an00309_.gif", "an00310_.gif", "an00311_.gif", "an00339_.gif", "an00390_.gif",
			"an00391_.gif", "an00392_.gif", "an00393_.gif", "an00394_.gif", "an00395_.gif",
			"an00457_.gif", "an00458_.gif", "an00480_.gif", "an00481_.gif", "an00495_.gif",
			"an00496_.gif", "an00497_.gif", "an00498_.gif", "an00499_.gif", "an00500_.gif",
			"an00501_.gif", "an00502_.gif", "an00503_.gif", "an00504_.gif", "an00532_.gif",
			"an00573_.gif", "an00574_.gif", "an00576_.gif", "an00598_.gif", "an00605_.gif",
			"an00606_.gif", "an00607_.gif", "an00608_.gif", "an00609_.gif", "an00610_.gif",
			"an00611_.gif", "an00612_.gif", "an00613_.gif", "an00614_.gif", "an00616_.gif",
			"an00617_.gif", "an00618_.gif", "an00619_.gif", "an00621_.gif", "an00622_.gif",
			"an00623_.gif", "an00624_.gif", "an00625_.gif", "an00626_.gif", "an00668_.gif",
			"an00669_.gif", "an00674_.gif", "an00675_.gif", "an00708_.gif", "an00730_.gif",
			"an00731_.gif", "an00732_.gif", "an00733_.gif", "an00734_.gif", "an00735_.gif",
			"an00736_.gif", "an00737_.gif", "an00745_.gif", "an00747_.gif", "an00748_.gif",
			"an00761_.gif", "an00763_.gif", "an00885_.gif", "an00886_.gif", "an00888_.gif",
			"an00889_.gif", "an00902_.gif", "an00908_.gif", "an00930_.gif", "an00933_.gif",
			"an00934_.gif", "an00978_.gif", "an00994_.gif", "an01017_.gif", "an01018_.gif",
			"an01019_.gif", "an01020_.gif", "an01021_.gif", "an01022_.gif", "an01034_.gif",
			"an01035_.gif", "an01045_.gif"
		]
	},
	2: {
		"name": "Cats & Dogs",
		"parent": "Animals",
        "path": "Animals/Cats_n_Dogs",
		"images": [
			"an00261_.gif", "an00297_.gif", "an00298_.gif", "an00302_.gif", "an00305_.gif",
			"an00340_.gif", "an00341_.gif", "an00355_.gif", "an00356_.gif", "an00357_.gif",
			"an00358_.gif", "an00359_.gif", "an00360_.gif", "an00361_.gif", "an00362_.gif",
			"an00363_.gif", "an00364_.gif", "an00365_.gif", "an00366_.gif", "an00367_.gif",
			"an00368_.gif", "an00369_.gif", "an00370_.gif", "an00371_.gif", "an00372_.gif",
			"an00373_.gif", "an00374_.gif", "an00375_.gif", "an00475_.gif", "an00490_.gif",
			"an00491_.gif", "an00492_.gif", "an00493_.gif", "an00494_.gif", "an00579_.gif",
			"an00580_.gif", "an00643_.gif", "an00644_.gif", "an00645_.gif", "an00661_.gif",
			"an00662_.gif", "an00670_.gif", "an00739_.gif", "an00740_.gif", "an00741_.gif",
			"an00743_.gif", "an00744_.gif", "an00891_.gif", "an00903_.gif", "an00904_.gif",
			"an00905_.gif", "an00906_.gif", "an00907_.gif", "an00921_.gif", "an00922_.gif",
			"an00923_.gif", "an00924_.gif", "an00925_.gif", "an00926_.gif", "an00927_.gif",
			"an00973_.gif", "an00984_.gif", "an00988_.gif", "an01032_.gif", "an01102_.gif",
			"na00315_.gif"
		]
	},
	3: {
		"name": "Farm Animals",
		"parent": "Animals",
        "path": "Animals/Farm_Animals",
		"images": [
			"an00315_.gif", "an00316_.gif", "an00317_.gif", "an00318_.gif", "an00319_.gif",
			"an00320_.gif", "an00627_.gif", "an00628_.gif", "an00629_.gif", "an00630_.gif",
			"an00632_.gif", "an00690_.gif", "an00691_.gif", "an00692_.gif", "an00693_.gif",
			"an00694_.gif"
		]
	},
	4: {
		"name": "Fish & Sealife",
		"parent": "Animals",
		"path": "Animals/Fish_n_Sealife",
		"images": [
			"an00200_.gif", "an00312_.gif", "an00324_.gif", "an00325_.gif", "an00326_.gif",
			"an00327_.gif", "an00328_.gif", "an00329_.gif", "an00376_.gif", "an00377_.gif",
			"an00378_.gif", "an00379_.gif", "an00380_.gif", "an00381_.gif", "an00382_.gif",
			"an00396_.gif", "an00410_.gif", "an00411_.gif", "an00412_.gif", "an00413_.gif",
			"an00414_.gif", "an00415_.gif", "an00416_.gif", "an00417_.gif", "an00418_.gif",
			"an00419_.gif", "an00420_.gif", "an00421_.gif", "an00422_.gif", "an00423_.gif",
			"an00424_.gif", "an00425_.gif", "an00426_.gif", "an00427_.gif", "an00428_.gif",
			"an00429_.gif", "an00430_.gif", "an00431_.gif", "an00432_.gif", "an00433_.gif",
			"an00435_.gif", "an00436_.gif", "an00437_.gif", "an00438_.gif", "an00440_.gif",
			"an00441_.gif", "an00442_.gif", "an00443_.gif", "an00444_.gif", "an00445_.gif",
			"an00446_.gif", "an00447_.gif", "an00448_.gif", "an00449_.gif", "an00450_.gif",
			"an00451_.gif", "an00452_.gif", "an00453_.gif", "an00454_.gif", "an00455_.gif",
			"an00456_.gif", "an00488_.gif", "an00489_.gif", "an00533_.gif", "an00535_.gif",
			"an00536_.gif", "an00563_.gif", "an00564_.gif", "an00565_.gif", "an00566_.gif",
			"an00567_.gif", "an00568_.gif", "an00569_.gif", "an00570_.gif", "an00571_.gif",
			"an00600_.gif", "an00601_.gif", "an00602_.gif", "an00603_.gif", "an00676_.gif",
			"an00677_.gif", "an00678_.gif", "an00680_.gif", "an00681_.gif", "an00682_.gif",
			"an00683_.gif", "an00684_.gif", "an00685_.gif", "an00686_.gif", "an00687_.gif",
			"an00688_.gif", "an00696_.gif", "an00697_.gif", "an00712_.gif", "an00713_.gif",
			"an00720_.gif", "an00721_.gif", "an00722_.gif", "an00723_.gif", "an00729_.gif",
			"an00738_.gif", "an00764_.gif", "an00765_.gif", "an00766_.gif", "an00767_.gif",
			"an00768_.gif", "an00771_.gif", "an00876_.gif", "an00878_.gif", "an00928_.gif",
			"an00941_.gif", "an00942_.gif", "an00943_.gif", "an00944_.gif", "an00945_.gif",
			"an00946_.gif", "an00947_.gif", "an00948_.gif", "an00949_.gif", "an00950_.gif",
			"an00951_.gif", "an00952_.gif", "an00953_.gif", "an00954_.gif", "an00958_.gif",
			"an01046_.gif", "an01049_.gif", "an01052_.gif", "an01053_.gif", "an01074_.gif",
			"an01075_.gif", "an01076_.gif", "an01104_.gif", "dd00333_.gif", "hh00596_.gif",
			"na00298_.gif", "na00299_.gif", "na00300_.gif", "na00301_.gif", "na00302_.gif",
			"na00303_.gif", "na00304_.gif"
		]
	},
	5: {
		"name": "Horses",
		"parent": "Animals",
        "path": "Animals/Horses",
		"images": [
			"an00511_.gif", "an00512_.gif", "an00514_.gif", "an00515_.gif", "an00516_.gif",
			"an00517_.gif", "an00518_.gif", "an00519_.gif", "an00520_.gif", "an00521_.gif",
			"an00522_.gif", "an00523_.gif", "an00524_.gif", "an00525_.gif", "an00526_.gif",
			"an00527_.gif", "an00528_.gif", "an00529_.gif", "an00530_.gif", "an00572_.gif",
			"an00577_.gif", "an00979_.gif", "an00980_.gif", "an00981_.gif", "an00982_.gif",
			"an00983_.gif"
		]
	},
	6: {
		"name": "Insects & Reptiles",
		"parent": "Animals",
		"path": "Animals/Insects_n_Reptiles/",
		"images": [
			"an00192_.gif", "an00194_.gif", "an00196_.gif", "an00206_.gif", "an00207_.gif",
			"an00208_.gif", "an00209_.gif", "an00271_.gif", "an00272_.gif", "an00273_.gif",
			"an00274_.gif", "an00275_.gif", "an00276_.gif", "an00277_.gif", "an00278_.gif",
			"an00279_.gif", "an00282_.gif", "an00283_.gif", "an00284_.gif", "an00285_.gif",
			"an00286_.gif", "an00288_.gif", "an00289_.gif", "an00303_.gif", "an00313_.gif",
			"an00383_.gif", "an00384_.gif", "an00385_.gif", "an00459_.gif", "an00460_.gif",
			"an00461_.gif", "an00465_.gif", "an00466_.gif", "an00467_.gif", "an00468_.gif",
			"an00469_.gif", "an00470_.gif", "an00471_.gif", "an00472_.gif", "an00473_.gif",
			"an00474_.gif", "an00486_.gif", "an00487_.gif", "an00542_.gif", "an00543_.gif",
			"an00556_.gif", "an00557_.gif", "an00558_.gif", "an00559_.gif", "an00560_.gif",
			"an00561_.gif", "an00562_.gif", "an00582_.gif", "an00583_.gif", "an00641_.gif",
			"an00671_.gif", "an00672_.gif", "an00700_.gif", "an00701_.gif", "an00702_.gif",
			"an00703_.gif", "an00704_.gif", "an00705_.gif", "an00706_.gif", "an00707_.gif",
			"an00709_.gif", "an00710_.gif", "an00711_.gif", "an00756_.gif", "an00757_.gif",
			"an00758_.gif", "an00877_.gif", "an00931_.gif", "an00959_.gif", "an00985_.gif",
			"an00989_.gif", "an01054_.gif", "an01056_.gif", "an01063_.gif", "an01064_.gif",
			"an01065_.gif", "an01066_.gif", "an01094_.gif", "an01095_.gif", "dd00057_.gif"
		]
	},
	7: {
		"name": "Prehistoric",
		"parent": "Animals",
        "path": "Animals/Prehistoric",
		"images": [
			"an00263_.gif", "an00264_.gif", "an00268_.gif", "an00299_.gif", "an00300_.gif",
			"an00301_.gif", "an00330_.gif", "an00331_.gif", "an00332_.gif", "an00333_.gif",
			"an00334_.gif", "an00335_.gif", "an00336_.gif", "an00337_.gif", "an00338_.gif",
			"an00349_.gif", "an00350_.gif", "an00351_.gif", "an00352_.gif", "an00386_.gif",
			"an00387_.gif", "an00408_.gif", "an00483_.gif", "an00604_.gif", "an00633_.gif",
			"an00724_.gif", "an00726_.gif", "an00727_.gif", "an00728_.gif", "an00749_.gif",
			"an00750_.gif", "an00751_.gif", "an00752_.gif", "an00753_.gif", "an00892_.gif",
			"na00214_.gif"
		]
	},
	8: {
		"name": "Wildlife",
		"parent": "Animals",
        "path": "Animals/Wildlife",
		"images": [
			"an00205_.gif", "an00215_.gif", "an00216_.gif", "an00219_.gif", "an00220_.gif",
			"an00227_.gif", "an00228_.gif", "an00259_.gif", "an00260_.gif", "an00269_.gif",
			"an00270_.gif", "an00280_.gif", "an00281_.gif", "an00290_.gif", "an00291_.gif",
			"an00292_.gif", "an00293_.gif", "an00295_.gif", "an00321_.gif", "an00323_.gif",
			"an00342_.gif", "an00344_.gif", "an00345_.gif", "an00346_.gif", "an00347_.gif",
			"an00348_.gif", "an00397_.gif", "an00398_.gif", "an00399_.gif", "an00400_.gif",
			"an00401_.gif", "an00402_.gif", "an00403_.gif", "an00404_.gif", "an00405_.gif",
			"an00409_.gif", "an00462_.gif", "an00463_.gif", "an00464_.gif", "an00476_.gif",
			"an00477_.gif", "an00479_.gif", "an00484_.gif", "an00485_.gif", "an00505_.gif",
			"an00506_.gif", "an00507_.gif", "an00509_.gif", "an00510_.gif", "an00531_.gif",
			"an00534_.gif", "an00538_.gif", "an00539_.gif", "an00540_.gif", "an00541_.gif",
			"an00545_.gif", "an00546_.gif", "an00547_.gif", "an00548_.gif", "an00549_.gif",
			"an00550_.gif", "an00551_.gif", "an00552_.gif", "an00553_.gif", "an00554_.gif",
			"an00555_.gif", "an00578_.gif", "an00581_.gif", "an00584_.gif", "an00585_.gif",
			"an00586_.gif", "an00587_.gif", "an00588_.gif", "an00589_.gif", "an00590_.gif",
			"an00591_.gif", "an00592_.gif", "an00593_.gif", "an00594_.gif", "an00595_.gif",
			"an00597_.gif", "an00599_.gif", "an00615_.gif", "an00634_.gif", "an00635_.gif",
			"an00636_.gif", "an00637_.gif", "an00638_.gif", "an00639_.gif", "an00640_.gif",
			"an00642_.gif", "an00646_.gif", "an00647_.gif", "an00648_.gif", "an00649_.gif",
			"an00650_.gif", "an00651_.gif", "an00652_.gif", "an00653_.gif", "an00654_.gif",
			"an00656_.gif", "an00657_.gif", "an00658_.gif", "an00659_.gif", "an00660_.gif",
			"an00663_.gif", "an00664_.gif", "an00666_.gif", "an00667_.gif", "an00673_.gif",
			"an00698_.gif", "an00714_.gif", "an00715_.gif", "an00716_.gif", "an00717_.gif",
			"an00718_.gif", "an00719_.gif", "an00742_.gif", "an00762_.gif", "an00773_.gif",
			"an00774_.gif", "an00932_.gif", "an00974_.gif", "an00975_.gif", "an00999_.gif",
			"an01000_.gif", "an01004_.gif", "an01006_.gif", "an01007_.gif", "an01008_.gif",
			"an01033_.gif", "an01036_.gif", "an01037_.gif", "an01038_.gif", "an01042_.gif",
			"an01067_.gif", "Animals/Wildlife/an01088_.gif"
		]
	},
	9: {
		"name": "Animations",
        "path": "Animations",
		"images": [
			"AG00123_.gif", "AG00133_.gif", "AG00155_.gif", "AG00160_.gif", "AG00182_.gif",
			"AG00215_.gif", "AG00219_.gif", "AG00220_.gif", "AG00261_.gif", "AG00274_.gif",
			"AG00285_.gif", "AG00286_.gif", "AG00319_.gif", "AG00340_.gif", "AG00391_.gif",
			"AG00397_.gif", "AG00398_.gif", "AG00405_.gif", "AG00408_.gif", "AG00410_.gif",
			"AG00411_.gif", "AG00420_.gif", "AG00433_.gif", "AG00447_.gif", "AG00448_.gif",
			"AG00547_.gif", "AG00551_.gif", "AG00555_.gif", "AG00571_.gif", "j0162986.gif",
			"j0163033.gif", "j0163056.gif", "j0163078.gif", "j0163090.gif", "j0163096.gif",
			"j0163104.gif", "j0163107.gif", "j0163109.gif", "j0163110.gif", "j0163115.gif",
			"j0172476.gif", "j0172490.gif", "j0172508.gif", "j0172543.gif", "j0172548.gif",
			"j0172556.gif", "j0172595.gif", "j0172626.gif", "j0173960.gif", "j0173961.gif",
			"j0173963.gif", "j0173969.gif", "j0173982.gif", "j0173983.gif", "j0173986.gif",
			"j0173997.gif", "j0174001.gif", "j0174003.gif", "j0174006.gif", "j0174013.gif",
			"j0174014.gif", "j0174026.gif", "j0174027.gif", "j0174033.gif", "j0174035.gif",
			"j0178104.gif", "j0178108.gif", "j0178111.gif", "j0178117.gif", "j0178121.gif",
			"j0178125.gif", "j0178127.gif", "j0178136.gif", "j0178162.gif", "j0178164.gif",
			"j0178174.gif", "j0178179.gif", "j0178187.gif", "j0178198.gif", "j0178199.gif",
			"j0178204.gif", "j0178307.gif", "j0178308.gif", "j0178310.gif", "j0178313.gif",
			"j0186495.gif", "j0189190.gif", "j0189196.gif", "j0189198.gif", "j0189200.gif",
			"j0189201.gif", "j0189203.gif", "j0189212.gif", "j0189213.gif", "j0189219.gif",
			"j0189227.gif", "j0189232.gif", "j0189242.gif", "j0189244.gif", "j0205341.gif",
			"j0205342.gif", "j0205345.gif", "j0205347.gif", "j0205348.gif", "j0205350.gif",
			"j0205352.gif", "j0205355.gif", "j0205356.gif", "j0205362.gif", "j0205367.gif",
			"j0205371.gif", "j0205384.gif", "j0205385.gif", "j0205391.gif", "j0205392.gif",
			"j0205394.gif", "j0205401.gif", "j0205402.gif", "j0213480.gif", "j0213490.gif",
			"j0213495.gif", "j0213497.gif", "j0213500.gif", "j0213501.gif", "j0213502.gif",
			"j0213508.gif", "j0213511.gif", "j0213515.gif", "j0213518.gif", "j0213520.gif",
			"j0213525.gif", "j0213531.gif", "j0213537.gif", "j0213539.gif", "LogoBounceAnim.gif",
			"LogoStripesAnim.gif"
		]
	},
	10: {
		"name": "Arrows & Hands",
        "path": "Arrows_n_Hands",
		"images": [
			"dd00023_.gif", "dd00024_.gif", "dd00025_.gif", "dd00026_.gif", "dd00027_.gif",
			"dd00028_.gif", "dd00029_.gif", "dd00030_.gif", "dd00031_.gif", "dd00036_.gif",
			"dd00037_.gif", "dd00038_.gif", "dd00039_.gif", "dd00040_.gif", "dd00041_.gif",
			"dd00042_.gif", "dd00043_.gif", "dd00044_.gif", "dd00045_.gif", "dd00046_.gif",
			"dd00047_.gif", "dd00048_.gif", "dd00049_.gif", "dd00050_.gif", "dd00051_.gif",
			"dd00052_.gif", "dd00053_.gif", "dd00054_.gif", "dd00055_.gif", "dd00056_.gif",
			"dd00203_.gif", "dd00207_.gif", "pe00363_.gif", "pe00364_.gif", "pe00365_.gif",
			"pe00402_.gif", "pe00423_.gif", "pe00424_.gif", "pe00438_.gif", "pe00460_.gif",
			"pe00715_.gif", "pe00716_.gif", "pe00717_.gif", "pe00718_.gif", "pe00719_.gif",
			"pe00720_.gif", "pe00721_.gif", "pe00802_.gif", "pe00927_.gif", "pe00962_.gif",
			"sy00073_.gif"
		]
	},
	11: {
		"name": "Business",
        "path": "Business",
		"images": [
			"BS00065_.gif", "BS00066_.gif", "BS00067_.gif", "BS00068_.gif", "BS00069_.gif",
			"BS00070_.gif", "BS00071_.gif", "BS00072_.gif", "BS00073_.gif", "BS00074_.gif",
			"BS00075_.gif", "BS00076_.gif", "BS00078_.gif", "BS00079_.gif", "BS00082_.gif",
			"BS00085_.gif", "BS00086_.gif", "BS00087_.gif", "BS00088_.gif", "BS00089_.gif",
			"BS00090_.gif", "BS00092_.gif", "BS00094_.gif", "BS00095_.gif", "BS00096_.gif",
			"BS00098_.gif", "BS00099_.gif", "BS00100_.gif", "BS00102_.gif", "BS00103_.gif",
			"BS00104_.gif", "BS00105_.gif", "BS00106_.gif", "BS00108_.gif", "BS00109_.gif",
			"BS00113_.gif", "BS00114_.gif", "BS00115_.gif", "BS00118_.gif", "BS00119_.gif",
			"BS00120_.gif", "BS00121_.gif", "BS00122_.gif", "BS00123_.gif", "BS00124_.gif",
			"BS00125_.gif", "BS00126_.gif", "BS00128_.gif", "BS00130_.gif", "BS00131_.gif",
			"BS00132_.gif", "BS00133_.gif", "BS00134_.gif", "BS00135_.gif", "BS00136_.gif",
			"BS00137_.gif", "BS00138_.gif", "BS00139_.gif", "BS00141_.gif", "BS00142_.gif",
			"BS00143_.gif", "BS00144_.gif", "BS00145_.gif", "BS00146_.gif", "BS00147_.gif",
			"BS00148_.gif", "BS00149_.gif", "BS00150_.gif", "BS00151_.gif", "BS00152_.gif",
			"BS00154_.gif", "BS00155_.gif", "BS00156_.gif", "BS00158_.gif", "BS00159_.gif",
			"BS00160_.gif", "BS00161_.gif", "BS00162_.gif", "BS00163_.gif", "BS00166_.gif",
			"BS00167_.gif", "BS00168_.gif", "BS00169_.gif", "BS00170_.gif", "BS00171_.gif",
			"BS00175_.gif", "BS00176_.gif", "BS00177_.gif", "BS00178_.gif", "BS00180_.gif",
			"BS00185_.gif", "BS00186_.gif", "BS00187_.gif", "BS00196_.gif", "BS00197_.gif",
			"BS00199_.gif", "BS00201_.gif", "BS00202_.gif", "BS00203_.gif", "BS00204_.gif",
			"BS00207_.gif", "BS00210_.gif", "BS00211_.gif", "BS00212_.gif", "BS00214_.gif",
			"BS00215_.gif", "BS00216_.gif", "BS00217_.gif", "BS00218_.gif", "BS00220_.gif",
			"BS00221_.gif", "BS00223_.gif", "BS00228_.gif", "BS00229_.gif"
		]
	},
	12: {
		"name": "Careers",
        "path": "Careers",
		"images": [
			"an00955_.gif", "an00995_.gif", "BS00208_.gif", "in00217_.gif", "in00218_.gif",
			"in00219_.gif", "in00222_.gif", "in00240_.gif", "pe00150_.gif", "pe00153_.gif",
			"pe00156_.gif", "pe00164_.gif", "pe00165_.gif", "pe00166_.gif", "pe00167_.gif",
			"pe00168_.gif", "pe00169_.gif", "pe00170_.gif", "pe00171_.gif", "pe00172_.gif",
			"pe00173_.gif", "pe00174_.gif", "pe00175_.gif", "pe00176_.gif", "pe00178_.gif",
			"pe00179_.gif", "pe00180_.gif", "pe00181_.gif", "pe00182_.gif", "pe00183_.gif",
			"pe00184_.gif", "pe00189_.gif", "pe00199_.gif", "pe00200_.gif", "pe00201_.gif",
			"pe00202_.gif", "pe00203_.gif", "pe00204_.gif", "pe00205_.gif", "pe00210_.gif",
			"pe00222_.gif", "pe00223_.gif", "pe00224_.gif", "pe00225_.gif", "pe00227_.gif",
			"pe00231_.gif", "pe00234_.gif", "pe00237_.gif", "pe00259_.gif", "pe00260_.gif",
			"pe00261_.gif", "pe00267_.gif", "pe00268_.gif", "pe00269_.gif", "pe00270_.gif",
			"pe00312_.gif", "pe00313_.gif", "pe00319_.gif", "pe00322_.gif", "pe00323_.gif",
			"pe00324_.gif", "pe00328_.gif", "pe00366_.gif", "pe00367_.gif", "pe00368_.gif",
			"pe00369_.gif", "pe00383_.gif", "pe00418_.gif", "pe00429_.gif", "pe00430_.gif",
			"pe00554_.gif", "pe00558_.gif", "pe00559_.gif", "pe00560_.gif", "pe00561_.gif",
			"pe00566_.gif", "pe00580_.gif", "pe00581_.gif", "pe00582_.gif", "pe00604_.gif",
			"pe00609_.gif", "pe00615_.gif", "pe00617_.gif", "pe00619_.gif", "pe00620_.gif",
			"pe00632_.gif", "pe00633_.gif", "pe00634_.gif", "pe00673_.gif", "pe00674_.gif",
			"pe00688_.gif", "pe00689_.gif", "pe00690_.gif", "pe00691_.gif", "pe00696_.gif",
			"pe00697_.gif", "pe00728_.gif", "pe00733_.gif", "pe00734_.gif", "pe00744_.gif",
			"pe00753_.gif", "pe00755_.gif", "pe00766_.gif", "pe00767_.gif", "pe00773_.gif",
			"pe00774_.gif", "pe00775_.gif", "pe00781_.gif", "pe00782_.gif", "pe00783_.gif",
			"pe00784_.gif", "pe00790_.gif", "pe00791_.gif", "pe00793_.gif", "pe00794_.gif",
			"pe00796_.gif", "pe00797_.gif", "pe00798_.gif", "pe00803_.gif", "pe00804_.gif",
			"pe00805_.gif", "pe00832_.gif", "pe00835_.gif", "pe00836_.gif", "pe00837_.gif",
			"pe00838_.gif", "pe00840_.gif", "pe00843_.gif", "pe00844_.gif", "pe00845_.gif",
			"pe00846_.gif", "pe00847_.gif", "pe00848_.gif", "pe00849_.gif", "pe00850_.gif",
			"pe00860_.gif", "pe00863_.gif", "pe00871_.gif", "pe00872_.gif", "pe00875_.gif",
			"pe00877_.gif", "pe00879_.gif", "pe00896_.gif", "pe00909_.gif", "pe00910_.gif",
			"pe00911_.gif", "pe00921_.gif", "pe00922_.gif", "pe00923_.gif", "pe00924_.gif",
			"pe00945_.gif", "pe00953_.gif", "pe00960_.gif", "pe00961_.gif"
		]
	},
	13: {
		"name": "Decorative",
        "path": "Decorative",
		"images": [
			"an01050_.gif", "bl00052_.gif", "dd00058_.gif", "dd00059_.gif", "dd00061_.gif",
			"dd00063_.gif", "dd00064_.gif", "dd00066_.gif", "dd00069_.gif", "dd00070_.gif",
			"dd00071_.gif", "dd00072_.gif", "dd00073_.gif", "dd00074_.gif", "dd00075_.gif",
			"dd00076_.gif", "dd00077_.gif", "dd00078_.gif", "dd00079_.gif", "dd00080_.gif",
			"dd00081_.gif", "dd00082_.gif", "dd00083_.gif", "dd00084_.gif", "dd00085_.gif",
			"dd00086_.gif", "dd00088_.gif", "dd00090_.gif", "dd00091_.gif", "dd00092_.gif",
			"dd00093_.gif", "dd00094_.gif", "dd00095_.gif", "dd00096_.gif", "dd00097_.gif",
			"dd00101_.gif", "dd00102_.gif", "dd00103_.gif", "dd00104_.gif", "dd00105_.gif",
			"dd00106_.gif", "dd00107_.gif", "dd00112_.gif", "dd00204_.gif", "dd00206_.gif",
			"dd00212_.gif", "dd00213_.gif", "dd00222_.gif", "dd00228_.gif", "dd00243_.gif",
			"dd00244_.gif", "dd00245_.gif", "dd00246_.gif", "dd00248_.gif", "dd00249_.gif",
			"dd00250_.gif", "dd00251_.gif", "dd00252_.gif", "dd00253_.gif", "dd00254_.gif",
			"dd00255_.gif", "dd00256_.gif", "dd00257_.gif", "dd00258_.gif", "dd00259_.gif",
			"dd00260_.gif", "dd00261_.gif", "dd00262_.gif", "dd00263_.gif", "dd00264_.gif",
			"dd00265_.gif", "dd00266_.gif", "dd00268_.gif", "dd00272_.gif", "dd00273_.gif",
			"dd00274_.gif", "dd00275_.gif", "dd00276_.gif", "dd00277_.gif", "dd00278_.gif",
			"dd00282_.gif", "dd00283_.gif", "dd00284_.gif", "dd00286_.gif", "dd00287_.gif",
			"dd00288_.gif", "dd00293_.gif", "dd00297_.gif", "dd00298_.gif", "dd00306_.gif",
			"dd00308_.gif", "dd00314_.gif", "dd00322_.gif", "dd00323_.gif", "dd00324_.gif",
			"dd00326_.gif",
		]
	},
	14: {
		"name": "Dino Letters",
        "path": "Dino_Letters",
		"images": [
			"sy00030_.gif", "sy00031_.gif", "sy00032_.gif", "sy00033_.gif", "sy00034_.gif",
			"sy00035_.gif", "sy00036_.gif", "sy00037_.gif", "sy00038_.gif", "sy00039_.gif",
			"sy00040_.gif", "sy00041_.gif", "sy00042_.gif", "sy00043_.gif", "sy00044_.gif",
			"sy00045_.gif", "sy00046_.gif", "sy00047_.gif", "sy00048_.gif", "sy00049_.gif",
			"sy00050_.gif", "sy00051_.gif", "sy00052_.gif", "sy00053_.gif", "sy00054_.gif",
			"sy00055_.gif"
		]
	},
	15: {
		"name": "Education",
        "path": "Education",
		"images": [
			"ed00011_.gif", "ed00013_.gif", "ed00014_.gif", "ed00015_.gif", "ed00016_.gif",
			"ed00017_.gif", "ed00018_.gif", "ed00021_.gif", "ed00024_.gif", "ed00025_.gif",
			"ed00026_.gif", "ed00027_.gif", "ed00030_.gif"
		]
	},
	16: {
		"name": "Entertainment",
        "path": "Entertainment",
		"images": [
			"bl00165_.gif", "en00118_.gif", "en00119_.gif", "en00120_.gif", "en00121_.gif",
			"en00122_.gif", "en00123_.gif", "en00124_.gif", "en00125_.gif", "en00126_.gif",
			"en00127_.gif", "en00147_.gif", "en00148_.gif", "en00160_.gif", "en00161_.gif",
			"en00170_.gif", "en00171_.gif", "en00172_.gif", "en00173_.gif", "en00174_.gif",
			"en00175_.gif", "en00176_.gif", "en00177_.gif", "en00178_.gif", "en00179_.gif",
			"en00186_.gif", "en00201_.gif", "en00202_.gif", "en00203_.gif", "en00204_.gif",
			"en00205_.gif", "en00207_.gif", "en00208_.gif", "en00209_.gif", "en00210_.gif",
			"en00211_.gif", "en00214_.gif", "en00215_.gif", "en00223_.gif", "en00240_.gif",
			"en00242_.gif", "en00243_.gif", "en00244_.gif", "en00245_.gif", "en00246_.gif",
			"en00247_.gif", "en00248_.gif", "en00249_.gif", "en00250_.gif", "en00251_.gif",
			"en00252_.gif", "en00256_.gif", "en00257_.gif", "en00260_.gif", "en00261_.gif"
		]
	},
	17: {
		"name": "Flags",
		"path": "Flags",
		"images": [
			"fl00048_.gif", "fl00049_.gif", "fl00050_.gif", "fl00051_.gif", "fl00052_.gif",
			"fl00053_.gif", "fl00054_.gif", "fl00055_.gif", "fl00056_.gif", "fl00057_.gif",
			"fl00058_.gif", "fl00059_.gif"
		]
	},
	18: {
		"name": "Food",
		"categories": [
			[19, "Beverages"],
			[20, "Deserts"],
			[21, "Fruit"],
			[22, "Meat"],
			[23, "Other"],
			[24, "Vegetables"]
		]
	},
	19: {
		"name": "Beverages",
		"parent": "Food",
        "path": "Food/Beverages",
		"images": [
			"fd00133_.gif", "fd00134_.gif", "fd00215_.gif", "fd00216_.gif", "fd00228_.gif",
			"fd00229_.gif", "fd00230_.gif", "fd00267_.gif", "fd00268_.gif", "fd00269_.gif",
			"fd00270_.gif", "fd00271_.gif", "fd00272_.gif", "fd00273_.gif", "fd00274_.gif",
			"fd00275_.gif", "fd00288_.gif", "fd00289_.gif", "fd00290_.gif", "fd00291_.gif",
			"fd00292_.gif", "fd00316_.gif", "fd00353_.gif", "fd00380_.gif", "fd00431_.gif",
			"fd00436_.gif", "fd00437_.gif"
		]
	},
	20: {
		"name": "Deserts",
		"parent": "Food",
        "path": "Food/Deserts",
		"images": [
			"fd00127_.gif", "fd00128_.gif", "fd00163_.gif", "fd00166_.gif", "fd00168_.gif",
			"fd00175_.gif", "fd00176_.gif", "fd00192_.gif", "fd00209_.gif", "fd00210_.gif",
			"fd00211_.gif", "fd00213_.gif", "fd00214_.gif", "fd00222_.gif", "fd00242_.gif",
			"fd00260_.gif", "fd00322_.gif", "fd00326_.gif", "fd00338_.gif", "fd00348_.gif",
			"fd00408_.gif", "fd00422_.gif", "fd00423_.gif"
		]
	},
	21: {
		"name": "Fruit",
		"parent": "Food",
        "path": "Food/Fruit",
		"images": [
			"fd00109_.gif", "fd00110_.gif", "fd00112_.gif", "fd00113_.gif", "fd00114_.gif",
			"fd00122_.gif", "fd00124_.gif", "fd00125_.gif", "fd00160_.gif", "fd00161_.gif",
			"fd00162_.gif", "fd00186_.gif", "fd00187_.gif", "fd00188_.gif", "fd00193_.gif",
			"fd00194_.gif", "fd00195_.gif", "fd00196_.gif", "fd00218_.gif", "fd00219_.gif",
			"fd00220_.gif", "fd00221_.gif", "fd00226_.gif", "fd00236_.gif", "fd00237_.gif",
			"fd00241_.gif", "fd00261_.gif", "fd00262_.gif", "fd00278_.gif", "fd00279_.gif",
			"fd00280_.gif", "fd00285_.gif", "fd00286_.gif", "fd00287_.gif", "fd00309_.gif",
			"fd00310_.gif", "fd00311_.gif", "fd00312_.gif", "fd00314_.gif", "fd00315_.gif",
			"fd00317_.gif", "fd00318_.gif", "fd00319_.gif", "fd00320_.gif", "fd00331_.gif",
			"fd00332_.gif", "fd00333_.gif", "fd00362_.gif", "fd00363_.gif", "fd00364_.gif",
			"fd00365_.gif", "fd00369_.gif", "fd00370_.gif", "fd00371_.gif", "fd00372_.gif",
			"fd00374_.gif", "fd00403_.gif", "fd00404_.gif", "fd00419_.gif", "fd00420_.gif",
			"fd00421_.gif", "fd00438_.gif", "na00240_.gif", "na00241_.gif", "na00248_.gif",
			"na00249_.gif", "na00250_.gif", "na00251_.gif", "na00253_.gif", "na00254_.gif",
			"na00255_.gif"
		]
	},
	22: {
		"name": "Meat",
		"parent": "Food",
        "path": "Food/Meats",
		"images": [
			"fd00121_.gif", "fd00129_.gif", "fd00130_.gif", "fd00131_.gif", "fd00132_.gif",
			"fd00179_.gif", "fd00180_.gif", "fd00181_.gif", "fd00182_.gif", "fd00198_.gif",
			"fd00199_.gif", "fd00201_.gif", "fd00202_.gif", "fd00206_.gif", "fd00207_.gif",
			"fd00208_.gif", "fd00246_.gif", "fd00247_.gif", "fd00248_.gif", "fd00263_.gif",
			"fd00281_.gif", "fd00282_.gif", "fd00283_.gif", "fd00349_.gif", "fd00352_.gif",
			"fd00357_.gif", "fd00360_.gif", "fd00376_.gif", "fd00385_.gif", "fd00432_.gif",
			"fd00433_.gif"
		]
	},
	23: {
		"name": "Other",
		"parent": "Food",
        "path": "Food/Other",
		"images": [
			"dd00065_.gif", "fd00141_.gif", "fd00142_.gif", "fd00143_.gif", "fd00156_.gif",
			"fd00157_.gif", "fd00158_.gif", "fd00167_.gif", "fd00174_.gif", "fd00177_.gif",
			"fd00178_.gif", "fd00183_.gif", "fd00184_.gif", "fd00185_.gif", "fd00197_.gif",
			"fd00203_.gif", "fd00205_.gif", "fd00231_.gif", "fd00232_.gif", "fd00233_.gif",
			"fd00238_.gif", "fd00239_.gif", "fd00240_.gif", "fd00243_.gif", "fd00244_.gif",
			"fd00245_.gif", "fd00249_.gif", "fd00250_.gif", "fd00251_.gif", "fd00253_.gif",
			"fd00255_.gif", "fd00256_.gif", "fd00257_.gif", "fd00258_.gif", "fd00259_.gif",
			"fd00264_.gif", "fd00265_.gif", "fd00266_.gif", "fd00276_.gif", "fd00277_.gif",
			"fd00323_.gif", "fd00324_.gif", "fd00329_.gif", "fd00330_.gif", "fd00358_.gif",
			"fd00361_.gif", "fd00375_.gif", "fd00377_.gif", "fd00383_.gif", "fd00386_.gif",
			"fd00387_.gif", "fd00395_.gif", "fd00405_.gif", "fd00410_.gif", "fd00418_.gif",
			"fd00427_.gif", "sn00001_.gif"
		]
	},
	24: {
		"name": "Vegetables",
		"parent": "Food",
        "path": "Food/Vegetables",
		"images": [
			"fd00116_.gif", "fd00117_.gif", "fd00120_.gif", "fd00136_.gif", "fd00137_.gif",
			"fd00138_.gif", "fd00144_.gif", "fd00145_.gif", "fd00146_.gif", "fd00147_.gif",
			"fd00148_.gif", "fd00149_.gif", "fd00150_.gif", "fd00151_.gif", "fd00152_.gif",
			"fd00153_.gif", "fd00154_.gif", "fd00155_.gif", "fd00164_.gif", "fd00165_.gif",
			"fd00169_.gif", "fd00170_.gif", "fd00171_.gif", "fd00172_.gif", "fd00189_.gif",
			"fd00190_.gif", "fd00191_.gif", "fd00223_.gif", "fd00224_.gif", "fd00225_.gif",
			"fd00227_.gif", "fd00234_.gif", "fd00235_.gif", "fd00313_.gif", "fd00325_.gif",
			"fd00327_.gif", "fd00328_.gif", "fd00337_.gif", "fd00354_.gif", "fd00355_.gif",
			"fd00366_.gif", "fd00367_.gif", "fd00391_.gif", "fd00392_.gif", "fd00393_.gif",
			"fd00394_.gif", "fd00396_.gif", "fd00398_.gif", "fd00401_.gif", "fd00402_.gif",
			"fd00411_.gif", "fd00412_.gif", "fd00413_.gif", "fd00414_.gif", "fd00415_.gif",
			"fd00416_.gif", "fd00429_.gif", "fd00430_.gif", "na00243_.gif", "na00244_.gif",
			"na00245_.gif", "na00246_.gif", "na00247_.gif", "na00263_.gif", "na00264_.gif",
			"na00265_.gif", "na00372_.gif", "na00373_.gif"
		]
	},
	25: {
		"name": "Household Objects",
		"categories": [
            [26, "Appliances"],
            [27, "Bath"],
            [28, "Clothing"],
			[29, "Electronics"],
			[30, "Furniture"],
            [31, "Garden"],
			[32, "Kids Stuff"],
			[33, "Kitchen"],
			[34, "Miscellaneous"],
			[35, "Office"],
            [36, "Tools"]
		]
	},
	26: {
		"name": "Appliances",
		"parent": "Household Objects",
		"path": "Household_Objects/Appliances",
		"images": [
			"fd00118_.gif", "fd00119_.gif", "hh00058_.gif", "hh00067_.gif", "hh00069_.gif",
			"hh00100_.gif", "hh00153_.gif", "hh00154_.gif", "hh00155_.gif", "hh00156_.gif",
			"hh00159_.gif", "hh00164_.gif", "hh00165_.gif", "hh00253_.gif", "hh00495_.gif",
			"hh00496_.gif",	"hh00579_.gif", "hh00604_.gif", "hh00695_.gif", "hh00696_.gif"
		]
	},
	27: {
		"name": "Bath",
		"parent": "Household Objects",
		"path": "Household_Objects/Bath",
		"images": [
			"fd00126_.gif", "hh00189_.gif", "hh00190_.gif", "hh00232_.gif", "hh00244_.gif",
			"hh00245_.gif", "hh00395_.gif", "hh00452_.gif", "hh00456_.gif", "hh00457_.gif",
			"hh00459_.gif", "hh00461_.gif", "hh00462_.gif", "hh00463_.gif", "hh00477_.gif",
			"hh00478_.gif",	"hh00536_.gif"
		]
	},
	28: {
		"name": "Clothing",
		"parent": "Household Objects",
		"path": "Household_Objects/Clothing",
		"images": [
			"hh00070_.gif", "hh00071_.gif", "hh00072_.gif", "hh00073_.gif", "hh00074_.gif",
			"hh00078_.gif", "hh00117_.gif", "hh00123_.gif", "hh00137_.gif", "hh00138_.gif",
			"hh00214_.gif", "hh00215_.gif", "hh00217_.gif", "hh00255_.gif", "hh00352_.gif",
			"hh00405_.gif",	"hh00449_.gif", "hh00481_.gif", "hh00482_.gif", "hh00489_.gif",
			"hh00490_.gif", "hh00491_.gif", "hh00497_.gif", "hh00498_.gif", "hh00499_.gif",
			"hh00511_.gif", "hh00512_.gif", "hh00521_.gif", "hh00534_.gif", "hh00535_.gif",
			"hh00593_.gif", "hh00594_.gif",	"hh00665_.gif", "hh00694_.gif"
		]
	},
	29: {
		"name": "Electronics",
		"parent": "Household Objects",
        "path": "Household_Objects/Electronics",
		"images": [
			"hh00046_.gif", "hh00055_.gif", "hh00056_.gif", "hh00057_.gif", "hh00063_.gif",
			"hh00064_.gif", "hh00065_.gif", "hh00079_.gif", "hh00081_.gif", "hh00082_.gif",
			"hh00083_.gif", "hh00084_.gif", "hh00085_.gif", "hh00086_.gif", "hh00087_.gif",
			"hh00088_.gif",	"hh00089_.gif", "hh00090_.gif", "hh00091_.gif", "hh00092_.gif",
			"hh00093_.gif", "hh00094_.gif", "hh00095_.gif", "hh00096_.gif", "hh00097_.gif",
			"hh00098_.gif", "hh00099_.gif", "hh00101_.gif", "hh00102_.gif", "hh00103_.gif",
			"hh00121_.gif", "hh00132_.gif", "hh00135_.gif", "hh00162_.gif", "hh00163_.gif",
			"hh00250_.gif", "hh00428_.gif", "hh00429_.gif", "hh00430_.gif", "hh00431_.gif",
			"hh00432_.gif", "hh00433_.gif", "hh00434_.gif", "hh00435_.gif", "hh00436_.gif",
			"hh00437_.gif", "hh00438_.gif", "hh00439_.gif", "hh00440_.gif", "hh00441_.gif",
			"hh00442_.gif", "hh00443_.gif", "hh00444_.gif", "hh00647_.gif", "hh00649_.gif",
			"hh00693_.gif"
		]
	},
	30: {
		"name": "Furniture",
		"parent": "Household Objects",
		"path": "Household_Objects/Furniture",
		"images": [
			"hh00059_.gif", "hh00060_.gif", "hh00106_.gif", "hh00107_.gif", "hh00108_.gif",
			"hh00109_.gif", "hh00145_.gif", "hh00146_.gif", "hh00147_.gif", "hh00148_.gif",
			"hh00149_.gif", "hh00151_.gif", "hh00300_.gif", "hh00301_.gif", "hh00302_.gif",
			"hh00308_.gif",	"hh00309_.gif", "hh00341_.gif", "hh00383_.gif", "hh00384_.gif",
			"hh00409_.gif", "hh00413_.gif", "hh00414_.gif", "hh00415_.gif", "hh00473_.gif",
			"hh00474_.gif", "hh00475_.gif", "hh00476_.gif"
		]
	},
	31: {
		"name": "Garden",
		"parent": "Household Objects",
		"path": "Household_Objects/Garden",
		"images": [
			"hh00501_.gif", "hh00502_.gif", "hh00503_.gif", "hh00504_.gif", "hh00581_.gif",
			"hh00582_.gif", "hh00583_.gif", "hh00585_.gif", "hh00586_.gif", "hh00587_.gif",
			"hh00588_.gif", "hh00589_.gif", "hh00590_.gif", "hh00591_.gif", "hh00612_.gif"
		]
	},
    32: {
		"name": "Kids Stuff",
		"parent": "Household Objects",
		"path": "Household_Objects/Kids_Stuff",
		"images": [
			"hh00048_.gif", "hh00049_.gif", "hh00050_.gif", "hh00051_.gif", "hh00052_.gif",
			"hh00053_.gif", "hh00068_.gif", "hh00134_.gif", "hh00144_.gif", "hh00150_.gif",
			"hh00218_.gif", "hh00219_.gif", "hh00268_.gif", "hh00342_.gif", "hh00346_.gif",
			"hh00402_.gif", "hh00425_.gif", "hh00427_.gif", "hh00464_.gif", "hh00465_.gif",
			"hh00520_.gif", "hh00539_.gif", "hh00569_.gif", "hh00575_.gif", "hh00576_.gif",
			"hh00629_.gif", "hh00639_.gif", "hh00640_.gif", "hh00680_.gif", "hh00686_.gif",
			"hh00687_.gif", "hh00688_.gif", "hh00689_.gif", "hh00690_.gif"
		]
	},
	33: {
		"name": "Kitchen",
		"parent": "Household Objects",
		"path": "Household_Objects/Kitchen",
		"images": [
			"fd00252_.gif", "hh00124_.gif", "hh00125_.gif", "hh00126_.gif", "hh00127_.gif",
			"hh00128_.gif", "hh00133_.gif", "hh00152_.gif", "hh00167_.gif", "hh00184_.gif",
			"hh00185_.gif", "hh00210_.gif", "hh00211_.gif", "hh00212_.gif", "hh00213_.gif",
			"hh00226_.gif", "hh00227_.gif", "hh00246_.gif", "hh00249_.gif", "hh00251_.gif",
			"hh00252_.gif", "hh00254_.gif", "hh00263_.gif", "hh00280_.gif", "hh00307_.gif",
			"hh00310_.gif", "hh00311_.gif", "hh00316_.gif", "hh00317_.gif", "hh00343_.gif",
			"hh00344_.gif", "hh00345_.gif", "hh00350_.gif", "hh00378_.gif", "hh00379_.gif",
			"hh00380_.gif", "hh00382_.gif", "hh00386_.gif", "hh00403_.gif", "hh00404_.gif",
			"hh00406_.gif", "hh00418_.gif", "hh00419_.gif", "hh00420_.gif", "hh00421_.gif",
			"hh00422_.gif", "hh00424_.gif", "hh00450_.gif", "hh00451_.gif", "hh00483_.gif",
			"hh00543_.gif", "hh00550_.gif", "hh00551_.gif", "hh00554_.gif", "hh00555_.gif",
			"hh00556_.gif", "hh00557_.gif", "hh00666_.gif", "hh00692_.gif"
		]
	},
	34: {
		"name": "Miscellaneous",
		"parent": "Household Objects",
		"path": "Household_Objects/Miscellaneous",
		"images": [
			"bl00090_.gif", "hh00113_.gif", "hh00114_.gif", "hh00115_.gif", "hh00116_.gif",
			"hh00118_.gif", "hh00129_.gif", "hh00130_.gif", "hh00131_.gif", "hh00139_.gif",
			"hh00140_.gif", "hh00141_.gif", "hh00142_.gif", "hh00143_.gif", "hh00157_.gif",
			"hh00158_.gif", "hh00160_.gif", "hh00161_.gif", "hh00166_.gif", "hh00168_.gif",
			"hh00169_.gif", "hh00170_.gif", "hh00171_.gif", "hh00172_.gif", "hh00173_.gif",
			"hh00174_.gif", "hh00177_.gif", "hh00178_.gif", "hh00179_.gif", "hh00180_.gif",
			"hh00181_.gif", "hh00182_.gif", "hh00209_.gif", "hh00221_.gif", "hh00222_.gif",
			"hh00224_.gif", "hh00225_.gif", "hh00228_.gif", "hh00233_.gif", "hh00234_.gif",
			"hh00235_.gif", "hh00236_.gif", "hh00237_.gif", "hh00240_.gif", "hh00247_.gif",
			"hh00248_.gif", "hh00256_.gif", "hh00299_.gif", "hh00387_.gif", "hh00388_.gif",
			"hh00389_.gif", "hh00390_.gif", "hh00391_.gif", "hh00407_.gif", "hh00408_.gif",
			"hh00445_.gif", "hh00446_.gif", "hh00447_.gif", "hh00448_.gif", "hh00484_.gif",
			"hh00485_.gif", "hh00486_.gif", "hh00505_.gif", "hh00506_.gif", "hh00507_.gif",
			"hh00508_.gif", "hh00509_.gif", "hh00510_.gif", "hh00544_.gif", "hh00630_.gif",
			"hh00641_.gif", "hh00648_.gif", "hh00655_.gif", "hh00657_.gif", "hh00658_.gif",
			"hh00675_.gif", "hh00697_.gif"
		]
	},
	35: {
		"name": "Office",
		"parent": "Household Objects",
		"path": "Household_Objects/Office",
		"images": [
			"hh00120_.gif", "hh00216_.gif", "hh00230_.gif", "hh00231_.gif", "hh00238_.gif",
			"hh00239_.gif", "hh00241_.gif", "hh00242_.gif", "hh00258_.gif", "hh00259_.gif",
			"hh00260_.gif", "hh00261_.gif", "hh00264_.gif", "hh00265_.gif", "hh00266_.gif",
			"hh00267_.gif", "hh00269_.gif", "hh00270_.gif", "hh00271_.gif", "hh00277_.gif",
			"hh00278_.gif", "hh00279_.gif", "hh00296_.gif", "hh00297_.gif", "hh00298_.gif",
			"hh00303_.gif", "hh00304_.gif", "hh00305_.gif", "hh00306_.gif", "hh00329_.gif",
			"hh00330_.gif", "hh00331_.gif", "hh00332_.gif", "hh00333_.gif", "hh00334_.gif",
			"hh00351_.gif", "hh00396_.gif", "hh00397_.gif", "hh00398_.gif", "hh00399_.gif",
			"hh00410_.gif", "hh00411_.gif", "hh00416_.gif", "hh00532_.gif", "hh00533_.gif",
			"hh00541_.gif", "hh00542_.gif", "hh00545_.gif", "hh00546_.gif", "hh00548_.gif",
			"hh00549_.gif", "hh00560_.gif", "hh00561_.gif", "hh00562_.gif", "hh00563_.gif",
			"hh00578_.gif", "hh00580_.gif", "hh00592_.gif", "hh00617_.gif", "hh00623_.gif",
			"hh00627_.gif", "hh00633_.gif", "hh00634_.gif", "hh00646_.gif", "hh00668_.gif",
			"hh00670_.gif", "hh00672_.gif", "hh00673_.gif", "hh00678_.gif", "hh00679_.gif"
		]
	},
	36: {
		"name": "Tools",
		"parent": "Household Objects",
		"path": "Household_Objects/Tools",
		"images": [
			"hh00054_.gif", "hh00075_.gif", "hh00076_.gif", "hh00077_.gif", "hh00104_.gif",
			"hh00105_.gif", "hh00110_.gif", "hh00111_.gif", "hh00112_.gif", "hh00136_.gif",
			"hh00175_.gif", "hh00176_.gif", "hh00183_.gif", "hh00186_.gif", "hh00187_.gif",
			"hh00188_.gif", "hh00191_.gif", "hh00192_.gif", "hh00193_.gif", "hh00194_.gif",
			"hh00195_.gif", "hh00196_.gif", "hh00197_.gif", "hh00198_.gif", "hh00199_.gif",
			"hh00200_.gif", "hh00201_.gif", "hh00202_.gif", "hh00203_.gif", "hh00204_.gif",
			"hh00205_.gif", "hh00207_.gif", "hh00208_.gif", "hh00220_.gif", "hh00229_.gif",
			"hh00272_.gif", "hh00273_.gif", "hh00274_.gif", "hh00275_.gif", "hh00276_.gif",
			"hh00281_.gif", "hh00283_.gif", "hh00284_.gif", "hh00285_.gif", "hh00286_.gif",
			"hh00287_.gif", "hh00288_.gif", "hh00289_.gif", "hh00290_.gif", "hh00291_.gif",
			"hh00292_.gif", "hh00293_.gif", "hh00312_.gif", "hh00313_.gif", "hh00315_.gif",
			"hh00318_.gif", "hh00319_.gif", "hh00320_.gif", "hh00321_.gif", "hh00322_.gif",
			"hh00323_.gif", "hh00324_.gif", "hh00325_.gif", "hh00326_.gif", "hh00327_.gif",
			"hh00328_.gif", "hh00335_.gif", "hh00336_.gif", "hh00337_.gif", "hh00338_.gif",
			"hh00339_.gif", "hh00340_.gif", "hh00348_.gif", "hh00349_.gif", "hh00353_.gif",
			"hh00354_.gif", "hh00355_.gif", "hh00356_.gif", "hh00357_.gif", "hh00358_.gif",
			"hh00359_.gif", "hh00360_.gif", "hh00361_.gif", "hh00362_.gif", "hh00363_.gif",
			"hh00364_.gif", "hh00365_.gif", "hh00366_.gif", "hh00367_.gif", "hh00368_.gif",
			"hh00369_.gif", "hh00370_.gif", "hh00371_.gif", "hh00372_.gif", "hh00373_.gif",
			"hh00374_.gif", "hh00375_.gif", "hh00376_.gif", "hh00377_.gif", "hh00381_.gif",
			"hh00385_.gif", "hh00392_.gif", "hh00393_.gif", "hh00394_.gif", "hh00400_.gif",
			"hh00401_.gif", "hh00412_.gif", "hh00453_.gif", "hh00454_.gif", "hh00455_.gif",
			"hh00466_.gif", "hh00467_.gif", "hh00468_.gif", "hh00469_.gif", "hh00470_.gif",
			"hh00471_.gif", "hh00472_.gif", "hh00487_.gif", "hh00488_.gif", "hh00492_.gif",
			"hh00493_.gif", "hh00494_.gif", "hh00500_.gif", "hh00513_.gif", "hh00514_.gif",
			"hh00515_.gif", "hh00516_.gif", "hh00517_.gif", "hh00518_.gif", "hh00519_.gif",
			"hh00597_.gif", "hh00598_.gif", "hh00600_.gif", "hh00601_.gif", "hh00602_.gif",
			"hh00606_.gif", "hh00614_.gif", "hh00616_.gif", "hh00643_.gif", "hh00644_.gif",
			"hh00651_.gif", "hh00652_.gif", "hh00685_.gif"
		]
	},
	37: {
		"name": "Industrial Objects",
		"path": "Industrial_Objects",
		"images": [
			"in00023_.gif", "in00047_.gif", "in00048_.gif", "in00049_.gif", "in00051_.gif",
			"in00052_.gif", "in00053_.gif", "in00054_.gif", "in00055_.gif", "in00056_.gif",
			"in00057_.gif", "in00058_.gif", "in00059_.gif", "in00060_.gif", "in00062_.gif",
			"in00063_.gif", "in00064_.gif", "in00065_.gif", "in00066_.gif", "in00067_.gif",
			"in00068_.gif", "in00069_.gif", "in00070_.gif", "in00071_.gif", "in00072_.gif",
			"in00073_.gif", "in00074_.gif", "in00075_.gif", "in00076_.gif", "in00077_.gif",
			"in00078_.gif", "in00079_.gif", "in00080_.gif", "in00081_.gif", "in00082_.gif",
			"in00083_.gif", "in00084_.gif", "in00086_.gif", "in00087_.gif", "in00088_.gif",
			"in00089_.gif", "in00090_.gif", "in00091_.gif", "in00092_.gif", "in00094_.gif",
			"in00095_.gif", "in00096_.gif", "in00098_.gif", "in00100_.gif", "in00101_.gif",
			"in00102_.gif", "in00103_.gif", "in00104_.gif", "in00117_.gif", "in00118_.gif",
			"in00119_.gif", "in00120_.gif", "in00121_.gif", "in00122_.gif", "in00140_.gif",
			"in00141_.gif", "in00142_.gif", "in00143_.gif", "in00144_.gif", "in00145_.gif",
			"in00146_.gif", "in00147_.gif", "in00148_.gif", "in00149_.gif", "in00150_.gif",
			"in00151_.gif", "in00152_.gif", "in00153_.gif", "in00154_.gif", "in00155_.gif",
			"in00156_.gif", "in00158_.gif", "in00159_.gif", "in00160_.gif", "in00161_.gif",
			"in00162_.gif", "in00166_.gif", "in00167_.gif", "in00168_.gif", "in00169_.gif",
			"in00170_.gif", "in00171_.gif", "in00172_.gif", "in00173_.gif", "in00174_.gif",
			"in00175_.gif", "in00176_.gif", "in00177_.gif", "in00178_.gif", "in00179_.gif",
			"in00180_.gif", "in00181_.gif", "in00182_.gif", "in00197_.gif", "in00198_.gif",
			"in00204_.gif", "in00205_.gif", "in00206_.gif", "in00207_.gif", "in00208_.gif",
			"in00209_.gif", "in00210_.gif", "in00211_.gif", "in00212_.gif", "in00213_.gif",
			"in00216_.gif", "in00223_.gif", "in00224_.gif", "in00226_.gif", "in00227_.gif",
			"in00228_.gif", "in00229_.gif", "in00230_.gif", "in00232_.gif", "in00234_.gif",
			"in00235_.gif", "in00239_.gif", "tn00122_.gif", "tn00134_.gif"
		]
	},
	38: {
		"name": "Infants & Kids",
		"path": "Infants_n_Kids",
		"images": [
			"pe00567_.gif", "pe00568_.gif", "pe00569_.gif", "pe00570_.gif", "pe00571_.gif",
			"pe00572_.gif", "pe00573_.gif", "pe00574_.gif", "pe00575_.gif", "pe00576_.gif",
			"pe00577_.gif", "pe00578_.gif", "pe00579_.gif", "pe00623_.gif", "pe00624_.gif",
			"pe00625_.gif", "pe00626_.gif", "pe00627_.gif", "pe00628_.gif", "pe00629_.gif",
			"pe00630_.gif", "pe00631_.gif", "pe00685_.gif", "pe00686_.gif", "pe00748_.gif",
			"pe00749_.gif", "pe00751_.gif", "pe00752_.gif"
		]
	},
	39: {
		"name": "Maps & Globes",
		"path": "Maps_n_Globes",
		"images": [
			"mp00006_.gif", "mp00008_.gif", "mp00009_.gif", "mp00010_.gif", "mp00011_.gif",
			"mp00012_.gif", "mp00013_.gif", "mp00014_.gif", "mp00015_.gif", "mp00016_.gif",
			"mp00017_.gif", "mp00018_.gif", "mp00019_.gif", "mp00020_.gif", "mp00021_.gif",
			"mp00022_.gif", "mp00023_.gif", "mp00024_.gif", "mp00025_.gif", "mp00026_.gif",
			"mp00027_.gif"
		]
	},
	40: {
		"name": "Medical",
		"path": "Medical",
		"images": [
			"hm00023_.gif", "hm00024_.gif", "hm00025_.gif", "hm00026_.gif", "hm00027_.gif",
			"hm00028_.gif", "hm00029_.gif", "hm00030_.gif", "hm00032_.gif", "hm00034_.gif",
			"hm00035_.gif", "hm00036_.gif", "hm00037_.gif", "hm00038_.gif", "hm00039_.gif",
			"hm00040_.gif", "hm00041_.gif", "hm00042_.gif", "hm00043_.gif", "hm00044_.gif",
			"hm00045_.gif", "hm00046_.gif", "hm00047_.gif", "hm00048_.gif", "hm00049_.gif",
			"hm00050_.gif", "hm00051_.gif", "hm00052_.gif", "hm00053_.gif", "hm00054_.gif",
			"hm00055_.gif", "hm00056_.gif", "hm00058_.gif", "hm00060_.gif", "hm00061_.gif",
			"hm00062_.gif", "hm00063_.gif", "hm00064_.gif", "hm00065_.gif", "hm00066_.gif",
			"hm00067_.gif", "hm00068_.gif", "hm00069_.gif", "hm00070_.gif", "hm00071_.gif",
			"hm00072_.gif", "hm00073_.gif", "hm00074_.gif", "hm00075_.gif", "hm00076_.gif",
			"hm00077_.gif", "hm00078_.gif", "hm00079_.gif", "hm00080_.gif", "hm00081_.gif",
			"hm00082_.gif", "hm00083_.gif", "hm00084_.gif", "hm00085_.gif", "hm00086_.gif",
			"hm00087_.gif", "hm00088_.gif", "hm00089_.gif", "hm00090_.gif", "hm00091_.gif",
			"hm00092_.gif", "hm00093_.gif", "hm00094_.gif", "hm00095_.gif", "hm00096_.gif",
			"hm00097_.gif", "hm00098_.gif", "hm00100_.gif", "hm00101_.gif", "hm00102_.gif",
			"hm00104_.gif", "hm00105_.gif", "hm00106_.gif", "hm00107_.gif", "hm00109_.gif",
			"hm00110_.gif", "hm00111_.gif", "hm00112_.gif", "hm00113_.gif", "hm00114_.gif",
			"hm00115_.gif", "hm00117_.gif", "hm00118_.gif", "hm00119_.gif", "hm00121_.gif",
			"hm00122_.gif", "hm00123_.gif", "hm00124_.gif", "hm00125_.gif", "hm00126_.gif",
			"hm00129_.gif", "hm00131_.gif", "hm00132_.gif", "hm00134_.gif", "hm00135_.gif",
			"hm00136_.gif", "pe00770_.gif"
		]
	},
	41: {
		"name": "Music",
		"path": "Music",
		"images": [
			"en00083_.gif", "en00084_.gif", "en00085_.gif", "en00086_.gif", "en00087_.gif",
			"en00088_.gif", "en00089_.gif", "en00090_.gif", "en00091_.gif", "en00092_.gif",
			"en00093_.gif", "en00095_.gif", "en00096_.gif", "en00097_.gif", "en00098_.gif",
			"en00099_.gif", "en00100_.gif", "en00102_.gif", "en00103_.gif", "en00104_.gif",
			"en00105_.gif", "en00106_.gif", "en00107_.gif", "en00108_.gif", "en00109_.gif",
			"en00110_.gif", "en00111_.gif", "en00112_.gif", "en00113_.gif", "en00114_.gif",
			"en00115_.gif", "en00116_.gif", "en00117_.gif", "en00128_.gif", "en00129_.gif",
			"en00130_.gif", "en00131_.gif", "en00132_.gif", "en00133_.gif", "en00134_.gif",
			"en00135_.gif", "en00136_.gif", "en00137_.gif", "en00138_.gif", "en00139_.gif",
			"en00140_.gif", "en00141_.gif", "en00143_.gif", "en00144_.gif", "en00145_.gif",
			"en00146_.gif", "en00150_.gif", "en00151_.gif", "en00152_.gif", "en00153_.gif",
			"en00154_.gif", "en00155_.gif", "en00158_.gif", "en00159_.gif", "en00162_.gif",
			"en00163_.gif", "en00164_.gif", "en00165_.gif", "en00166_.gif", "en00167_.gif",
			"en00168_.gif", "en00169_.gif", "en00180_.gif", "en00182_.gif", "en00183_.gif",
			"en00184_.gif", "en00185_.gif", "en00212_.gif", "en00213_.gif", "en00216_.gif",
			"en00217_.gif", "en00218_.gif", "en00219_.gif", "en00220_.gif", "en00221_.gif",
			"en00222_.gif", "en00226_.gif", "en00227_.gif", "en00228_.gif", "en00229_.gif",
			"en00230_.gif", "en00253_.gif", "ne00001_.gif", "pe00374_.gif", "pe00375_.gif",
			"pe00376_.gif", "pe00381_.gif", "pe00382_.gif", "pe00391_.gif", "pe00392_.gif",
			"pe00432_.gif", "pe00461_.gif", "pe00563_.gif", "pe00585_.gif", "pe00712_.gif",
			"pe00713_.gif", "pe00737_.gif", "pe00785_.gif", "pe00786_.gif", "pe00787_.gif",
			"pe00788_.gif", "pe00862_.gif", "pe00870_.gif", "pe00925_.gif", "pe00926_.gif",
			"pe00933_.gif",	"pe00934_.gif"
		]
	},
	42: {
		"name": "Nature",
		"categories": [
			[43, "Flowers"],
			[44, "Foliage"],
			[45, "Other"],
			[46, "Scenic"],
			[47, "Weather"]
		]
	},
	43: {
		"name": "Flowers",
		"parent": "Nature",
		"path": "Nature/Flowers",
		"images": [
			"na00138_.gif", "na00139_.gif", "na00140_.gif", "na00141_.gif", "na00142_.gif",
			"na00143_.gif", "na00147_.gif", "na00148_.gif", "na00149_.gif", "na00150_.gif",
			"na00151_.gif", "na00152_.gif", "na00153_.gif", "na00154_.gif", "na00155_.gif",
			"na00156_.gif", "na00157_.gif", "na00158_.gif", "na00159_.gif", "na00160_.gif",
			"na00161_.gif", "na00162_.gif", "na00163_.gif", "na00164_.gif", "na00165_.gif",
			"na00166_.gif", "na00167_.gif", "na00168_.gif", "na00169_.gif", "na00170_.gif",
			"na00171_.gif", "na00172_.gif", "na00174_.gif", "na00175_.gif", "na00176_.gif",
			"na00177_.gif", "na00208_.gif", "na00213_.gif", "na00239_.gif", "na00273_.gif",
			"na00274_.gif", "na00275_.gif", "na00276_.gif", "na00277_.gif", "na00278_.gif",
			"na00279_.gif", "na00280_.gif", "na00281_.gif", "na00282_.gif", "na00283_.gif",
			"na00330_.gif", "na00365_.gif", "na00366_.gif", "na00367_.gif", "na00368_.gif",
			"na00369_.gif", "na00370_.gif", "na00371_.gif", "na00374_.gif", "na00458_.gif",
			"na00463_.gif", "na00464_.gif", "na00465_.gif", "na00466_.gif", "na00512_.gif",
			"na00513_.gif", "na00514_.gif", "na00515_.gif", "na00516_.gif", "na00531_.gif",
			"na00561_.gif"
		]
	},
	44: {
		"name": "Foliage",
		"parent": "Nature",
		"path": "Nature/Foliage",
		"images": [
			"hh00294_.gif", "hh00295_.gif", "na00122_.gif", "na00123_.gif", "na00124_.gif",
			"na00126_.gif", "na00127_.gif", "na00128_.gif", "na00129_.gif", "na00130_.gif",
			"na00131_.gif", "na00132_.gif", "na00133_.gif", "na00134_.gif", "na00137_.gif",
			"na00145_.gif", "na00179_.gif", "na00181_.gif", "na00182_.gif", "na00183_.gif",
			"na00186_.gif", "na00187_.gif", "na00188_.gif", "na00189_.gif", "na00190_.gif",
			"na00191_.gif", "na00192_.gif", "na00193_.gif", "na00194_.gif", "na00195_.gif",
			"na00196_.gif", "na00197_.gif", "na00198_.gif", "na00199_.gif", "na00200_.gif",
			"na00201_.gif", "na00202_.gif", "na00203_.gif", "na00204_.gif", "na00205_.gif",
			"na00206_.gif", "na00207_.gif", "na00210_.gif", "na00211_.gif", "na00217_.gif",
			"na00218_.gif", "na00227_.gif", "na00228_.gif", "na00229_.gif", "na00230_.gif",
			"na00231_.gif", "na00232_.gif", "na00233_.gif", "na00234_.gif", "na00235_.gif",
			"na00236_.gif", "na00237_.gif", "na00256_.gif", "na00257_.gif", "na00258_.gif",
			"na00259_.gif", "na00260_.gif", "na00261_.gif", "na00262_.gif", "na00284_.gif",
			"na00285_.gif", "na00286_.gif", "na00287_.gif", "na00288_.gif", "na00289_.gif",
			"na00290_.gif", "na00295_.gif", "na00296_.gif", "na00297_.gif", "na00335_.gif",
			"na00336_.gif", "na00337_.gif", "na00338_.gif", "na00339_.gif", "na00340_.gif",
			"na00341_.gif", "na00342_.gif", "na00343_.gif", "na00344_.gif", "na00345_.gif",
			"na00346_.gif", "na00347_.gif", "na00348_.gif", "na00349_.gif", "na00350_.gif",
			"na00351_.gif", "na00352_.gif", "na00353_.gif", "na00354_.gif", "na00355_.gif",
			"na00356_.gif", "na00357_.gif", "na00358_.gif", "na00359_.gif", "na00360_.gif",
			"na00361_.gif", "na00362_.gif", "na00363_.gif", "na00364_.gif", "na00376_.gif",
			"na00439_.gif", "na00442_.gif", "na00444_.gif", "na00445_.gif", "na00452_.gif",
			"na00453_.gif", "na00457_.gif", "na00478_.gif", "na00480_.gif", "na00481_.gif",
			"na00482_.gif", "na00483_.gif", "na00484_.gif", "na00485_.gif", "na00486_.gif",
			"na00487_.gif", "na00488_.gif", "na00489_.gif", "na00490_.gif", "na00500_.gif",
			"na00508_.gif", "na00537_.gif", "na00553_.gif", "na00554_.gif", "na00555_.gif",
			"na00556_.gif", "na00557_.gif", "na00558_.gif", "na00562_.gif"
		]
	},
	45: {
		"name": "Other",
		"parent": "Nature",
		"path": "Nature/Other",
		"images": [
			"na00117_.gif", "na00118_.gif", "na00119_.gif", "na00120_.gif", "na00121_.gif",
			"na00135_.gif", "na00144_.gif", "na00178_.gif", "na00180_.gif", "na00215_.gif",
			"na00216_.gif", "na00219_.gif", "na00220_.gif", "na00221_.gif", "na00252_.gif",
			"na00291_.gif", "na00292_.gif", "na00293_.gif", "na00294_.gif", "na00380_.gif",
			"na00381_.gif", "na00455_.gif", "na00518_.gif", "na00519_.gif", "na00520_.gif",
			"na00521_.gif", "na00533_.gif", "sl00143_.gif"
		]
	},
	46: {
		"name": "Scenic",
		"parent": "Nature",
		"path": "Nature/Scenic",
		"images": [
			"na00185_.gif", "na00222_.gif", "na00223_.gif", "na00224_.gif", "na00225_.gif",
			"na00226_.gif", "na00272_.gif", "na00331_.gif", "na00375_.gif", "na00440_.gif",
			"na00467_.gif", "na00496_.gif", "na00502_.gif", "na00503_.gif", "na00504_.gif",
			"na00505_.gif", "na00506_.gif", "na00517_.gif", "sl00144_.gif", "sl00145_.gif"
		]
	},
	47: {
		"name": "Weather",
		"parent": "Nature",
		"path": "Nature/Weather",
		"images": [
			"na00136_.gif", "na00266_.gif", "na00267_.gif", "na00268_.gif", "na00269_.gif",
			"na00270_.gif", "na00271_.gif", "na00305_.gif", "na00306_.gif", "na00307_.gif",
			"na00308_.gif", "na00309_.gif", "na00310_.gif", "na00311_.gif", "na00312_.gif",
			"na00313_.gif", "na00314_.gif", "na00316_.gif", "na00317_.gif", "na00318_.gif",
			"na00319_.gif", "na00320_.gif", "na00321_.gif", "na00322_.gif", "na00323_.gif",
			"na00324_.gif", "na00325_.gif", "na00326_.gif", "na00327_.gif", "na00328_.gif",
			"na00329_.gif", "na00332_.gif", "na00377_.gif", "na00378_.gif", "na00379_.gif",
			"na00382_.gif", "na00383_.gif", "na00441_.gif", "na00443_.gif", "na00446_.gif",
			"na00447_.gif", "na00468_.gif", "na00477_.gif", "na00491_.gif", "na00492_.gif",
			"na00493_.gif", "na00495_.gif", "na00497_.gif", "na00509_.gif", "na00510_.gif",
			"na00511_.gif", "na00522_.gif", "na00523_.gif", "na00525_.gif", "na00526_.gif",
			"na00527_.gif", "na00528_.gif", "na00529_.gif", "na00536_.gif", "na00539_.gif",
			"na00540_.gif", "na00541_.gif", "na00544_.gif", "na00545_.gif", "na00546_.gif",
			"na00547_.gif", "na00548_.gif", "na00550_.gif", "na00559_.gif", "na00560_.gif",
			"na00564_.gif", "na00566_.gif", "na00568_.gif"
		]
	},
	48: {
		"name": "People",
		"categories": [
			[49, "Abstract"],
			[50, "Cartoon"],
			[51, "Realistic"],
            [52, "Silhouettes"]
		]
	},
	49: {
		"name": "Abstract",
		"parent": "People",
		"path": "People/Abstract",
		"images": [
			"en00233_.gif", "en00234_.gif", "pe00162_.gif", "pe00196_.gif", "pe00197_.gif",
			"pe00235_.gif", "pe00236_.gif", "pe00238_.gif", "pe00240_.gif", "pe00241_.gif",
			"pe00243_.gif", "pe00244_.gif", "pe00245_.gif", "pe00246_.gif", "pe00248_.gif",
			"pe00249_.gif", "pe00250_.gif", "pe00251_.gif", "pe00252_.gif", "pe00253_.gif",
			"pe00273_.gif", "pe00275_.gif", "pe00276_.gif", "pe00293_.gif", "pe00304_.gif",
			"pe00307_.gif", "pe00320_.gif", "pe00339_.gif", "pe00340_.gif", "pe00341_.gif",
			"pe00342_.gif", "pe00350_.gif", "pe00351_.gif", "pe00352_.gif", "pe00355_.gif",
			"pe00356_.gif", "pe00357_.gif", "pe00358_.gif", "pe00360_.gif", "pe00361_.gif",
			"pe00371_.gif", "pe00384_.gif", "pe00385_.gif", "pe00387_.gif", "pe00415_.gif",
			"pe00442_.gif", "pe00610_.gif", "pe00679_.gif", "pe00858_.gif", "pe00915_.gif",
			"pe00930_.gif"
		]
	},
	50: {
		"name": "Cartoon",
		"parent": "People",
		"path": "People/Cartoon",
		"images": [
			"en00235_.gif", "en00236_.gif", "en00237_.gif", "en00238_.gif", "en00239_.gif",
			"pe00155_.gif", "pe00188_.gif", "pe00195_.gif", "pe00211_.gif", "pe00212_.gif",
			"pe00213_.gif", "pe00274_.gif", "pe00277_.gif", "pe00281_.gif", "pe00303_.gif",
			"pe00305_.gif", "pe00306_.gif", "pe00321_.gif", "pe00325_.gif", "pe00326_.gif",
			"pe00327_.gif", "pe00329_.gif", "pe00331_.gif", "pe00332_.gif", "pe00333_.gif",
			"pe00334_.gif", "pe00335_.gif", "pe00336_.gif", "pe00337_.gif", "pe00338_.gif",
			"pe00359_.gif", "pe00362_.gif", "pe00370_.gif", "pe00389_.gif", "pe00390_.gif",
			"pe00425_.gif", "pe00426_.gif", "pe00427_.gif", "pe00436_.gif", "pe00440_.gif",
			"pe00453_.gif", "pe00454_.gif", "pe00455_.gif", "pe00456_.gif", "pe00808_.gif",
			"pe00810_.gif", "pe00811_.gif", "pe00812_.gif", "pe00813_.gif", "pe00814_.gif",
			"pe00815_.gif", "pe00816_.gif", "pe00817_.gif", "pe00818_.gif", "pe00819_.gif",
			"pe00820_.gif", "pe00821_.gif", "pe00822_.gif", "pe00823_.gif", "pe00824_.gif",
			"pe00825_.gif",	"pe00907_.gif"
		]
	},
	51: {
		"name": "Realistic",
		"parent": "People",
		"path": "People/Realistic",
		"images": [
			"pe00152_.gif", "pe00157_.gif", "pe00185_.gif", "pe00186_.gif", "pe00187_.gif",
			"pe00214_.gif", "pe00215_.gif", "pe00216_.gif", "pe00217_.gif", "pe00219_.gif",
			"pe00254_.gif", "pe00255_.gif", "pe00256_.gif", "pe00257_.gif", "pe00258_.gif",
			"pe00278_.gif", "pe00279_.gif", "pe00280_.gif", "pe00282_.gif", "pe00288_.gif",
			"pe00289_.gif", "pe00291_.gif", "pe00292_.gif", "pe00294_.gif", "pe00316_.gif",
			"pe00317_.gif", "pe00318_.gif", "pe00386_.gif", "pe00419_.gif", "pe00421_.gif",
			"pe00443_.gif", "pe00444_.gif", "pe00445_.gif", "pe00446_.gif", "pe00447_.gif",
			"pe00448_.gif", "pe00449_.gif", "pe00451_.gif", "pe00452_.gif", "pe00458_.gif",
			"pe00459_.gif", "pe00583_.gif", "pe00592_.gif", "pe00593_.gif", "pe00594_.gif",
			"pe00595_.gif", "pe00596_.gif", "pe00597_.gif", "pe00598_.gif", "pe00612_.gif",
			"pe00613_.gif", "pe00614_.gif", "pe00675_.gif", "pe00698_.gif", "pe00768_.gif",
			"pe00769_.gif", "pe00795_.gif", "pe00799_.gif", "pe00800_.gif", "pe00801_.gif",
			"pe00806_.gif", "pe00809_.gif", "pe00859_.gif", "pe00869_.gif", "pe00876_.gif",
			"pe00878_.gif", "pe00897_.gif", "pe00914_.gif", "pe00937_.gif", "pe00955_.gif",
			"pe00956_.gif", "pe00959_.gif"
		]
	},
	52: {
		"name": "Silhouettes",
		"parent": "People",
		"path": "People/Silhouettes",
		"images": [
			"pe00343_.gif", "pe00344_.gif", "pe00345_.gif", "pe00346_.gif", "pe00347_.gif",
			"pe00348_.gif", "pe00349_.gif", "pe00353_.gif", "pe00354_.gif", "pe00564_.gif",
			"pe00589_.gif", "pe00590_.gif", "pe00591_.gif", "pe00681_.gif", "pe00695_.gif",
			"pe00699_.gif", "pe00700_.gif", "pe00701_.gif", "pe00702_.gif", "pe00703_.gif",
			"pe00704_.gif", "pe00725_.gif", "pe00765_.gif", "pe00839_.gif", "pe00855_.gif",
			"pe00856_.gif", "pe00857_.gif", "pe00898_.gif", "pe00899_.gif", "pe00900_.gif",
			"pe00901_.gif", "pe00908_.gif", "pe00916_.gif", "pe00917_.gif", "pe00929_.gif",
			"pe00935_.gif", "pe00936_.gif", "pe00954_.gif", "pe00958_.gif", "pe00963_.gif",
			"pe00964_.gif",	"pe00965_.gif"
		]
	},
	52: {
		"name": "Rogers Cable",
		"categories": [
			[53, "Flags"],
			[54, "Maps & Globes"],
			[55, "Special Occasions"],
			[57, "Sports"],
			[60, "Symbols"],
			[61, "Travel"]
		]
	},
	53: {
		"name": "Flags",
		"parent": "Rogers Cable",
		"path": "en-ROGERS/Flags",
		"images": [
			"ClipArt_FLAG.gif", "fl00048_.gif", "fl00049_.gif", "fl00050_.gif", "fl00051_.gif",
			"fl00052_.gif", "fl00053_.gif", "fl00054_.gif", "fl00055_.gif", "fl00056_.gif",
			"fl00057_.gif", "fl00058_.gif", "fl00059_.gif"
		]
	},
	54: {
		"name": "Maps & Globes",
		"parent": "Rogers Cable",
		"path": "en-ROGERS/Maps_n_Globes",
		"images": [
			"ClipArt_MAP.gif", "mp00006_.gif", "mp00008_.gif", "mp00009_.gif", "mp00010_.gif",
			"mp00011_.gif", "mp00012_.gif", "mp00013_.gif", "mp00014_.gif", "mp00015_.gif",
			"mp00016_.gif", "mp00017_.gif", "mp00018_.gif", "mp00019_.gif", "mp00020_.gif",
			"mp00021_.gif", "mp00022_.gif", "mp00023_.gif", "mp00024_.gif", "mp00025_.gif",
			"mp00026_.gif", "mp00027_.gif"
		]
	},
	55: {
		"name": "Special Occasions",
		"parent": "Rogers Cable",
		"categories": [
			[56, "Holidays"]
		]
	},
	56: {
		"name": "Holidays",
		"parent": "Roger's Cable : Special Occasions",
		"path": "en-ROGERS/Special_Occasions/Holidays",
		"images": [
			"an01040_.gif", "dd00067_.gif", "dd00068_.gif", "dd00242_.gif", "dd00330_.gif",
			"dd00337_.gif", "na00469_.gif", "na00471_.gif", "na00472_.gif", "na00473_.gif",
			"na00474_.gif", "na00475_.gif", "na00476_.gif", "pe00209_.gif", "pe00676_.gif",
			"pe00677_.gif", "pe00678_.gif", "pe00694_.gif", "sl00174_.gif", "so00087_.gif",
			"so00088_.gif", "so00089_.gif", "so00103_.gif", "so00104_.gif", "so00105_.gif",
			"so00107_.gif", "so00108_.gif", "so00111_.gif", "so00114_.gif", "so00115_.gif",
			"so00116_.gif", "so00117_.gif", "so00118_.gif", "so00119_.gif", "so00126_.gif",
			"so00127_.gif", "so00129_.gif", "so00130_.gif", "so00131_.gif", "so00132_.gif",
			"so00133_.gif", "so00134_.gif", "so00135_.gif", "so00136_.gif", "so00137_.gif",
			"so00142_.gif", "so00143_.gif", "so00148_.gif", "so00149_.gif", "so00151_.gif",
			"so00358_.gif", "so00359_.gif", "so00361_.gif", "so00362_.gif", "so00363_.gif",
			"so00394_.gif", "so00395_.gif", "so00396_.gif", "so00397_.gif", "so00398_.gif",
			"so00399_.gif", "so00411_.gif", "so00414_.gif", "so00415_.gif", "so00422_.gif",
			"so00423_.gif", "so00424_.gif", "so00427_.gif", "so00430_.gif", "so00446_.gif",
			"so00447_.gif", "so00451_.gif", "so00452_.gif", "so00453_.gif", "so00455_.gif",
			"so00470_.gif", "so00471_.gif", "so00472_.gif", "so00473_.gif", "so00474_.gif",
			"so00475_.gif", "so00480_.gif", "so00481_.gif", "so00482_.gif", "so00483_.gif",
			"so00487_.gif", "so00488_.gif", "so00496_.gif", "so00497_.gif", "so00498_.gif",
			"so00500_.gif", "so00503_.gif", "so00504_.gif", "so00505_.gif", "so00506_.gif",
			"so00511_.gif", "so00514_.gif", "so00516_.gif", "so00517_.gif", "so00523_.gif",
			"so00524_.gif", "so00526_.gif", "so00537_.gif", "so00538_.gif", "so00539_.gif",
			"so00542_.gif"
		]
	},
	57: {
		"name": "Sports",
		"parent": "Rogers Cable",
		"categories": [
			[58, "Hockey"],
			[59, "Winter"]
		]
	},
	58: {
		"name": "Hockey",
		"parent": "Rogers Cable : Sports",
		"path": "en-ROGERS/Sports/Hockey",
		"images": [
			"pe00302_.gif", "pe00724_.gif", "pe00881_.gif", "sl00175_.gif", "sl00176_.gif",
			"sl00304_.gif", "sl00305_.gif", "sl00306_.gif"
		]
	},
	59: {
		"name": "Winter",
		"parent": "Rogers Cable : Sports",
		"path": "en-ROGERS/Sports/Winter",
		"images": [
			"pe00393_.gif", "pe00395_.gif", "pe00396_.gif", "pe00397_.gif", "pe00398_.gif",
			"pe00399_.gif", "pe00400_.gif", "pe00401_.gif", "pe00882_.gif", "pe00883_.gif",
			"pe00884_.gif", "pe00885_.gif", "pe00886_.gif", "pe00887_.gif", "pe00888_.gif",
			"pe00889_.gif", "pe00890_.gif", "pe00891_.gif", "pe00892_.gif", "sl00189_.gif",
			"sl00215_.gif", "sl00326_.gif"
		]		
	},
	60: {
		"name": "Symbols",
		"parent": "Rogers Cable",
		"path": "en-ROGERS/Symbols",
		"images": [
			"pe00314_.gif", "pe00602_.gif", "pe00729_.gif", "pe00730_.gif", "sg00013_.gif",
			"sg00014_.gif", "sg00015_.gif", "sg00019_.gif", "sg00026_.gif", "sg00028_.gif",
			"sl00177_.gif", "sl00179_.gif", "sl00180_.gif", "sl00181_.gif", "sl00182_.gif",
			"sl00183_.gif", "sl00184_.gif", "sp00001_.gif", "sp00002_.gif", "sy00056_.gif",
			"sy00057_.gif", "sy00058_.gif", "sy00059_.gif", "sy00060_.gif", "sy00061_.gif",
			"sy00062_.gif", "sy00063_.gif", "sy00064_.gif", "sy00065_.gif", "sy00066_.gif",
			"sy00067_.gif", "sy00069_.gif", "sy00070_.gif", "sy00071_.gif", "sy00076_.gif",
			"sy00077_.gif", "sy00078_.gif", "sy00090_.gif", "sy00093_.gif", "sy00107_.gif",
			"sy00111_.gif", "sy00112_.gif", "sy00123_.gif", "sy00125_.gif", "sy00128_.gif",
			"sy00131_.gif", "sy00132_.gif", "sy00133_.gif", "sy00134_.gif", "sy00142_.gif",
			"sy00144_.gif", "sy00145_.gif", "sy00148_.gif", "sy00149_.gif", "sy00150_.gif",
			"sy00151_.gif", "sy00152_.gif", "sy00153_.gif", "sy00154_.gif", "sy00155_.gif",
			"sy00159_.gif", "sy00165_.gif", "sy00168_.gif", "sy00169_.gif", "sy00170_.gif"
		]
	},
	61: {
		"name": "Travel",
		"parent": "Rogers Cable",
		"categories": [
			[62, "Domestic"],
			[63, "International"]
		]			
	},
	62: {
		"name": "Domestic",
		"parent": "Rogers Cable : Travel",
		"path": "en-ROGERS/Travel/Domestic",
		"images": [
			"bl00045_.gif", "bl00048_.gif", "bl00055_.gif", "bl00057_.gif", "bl00058_.gif",
			"bl00059_.gif", "bl00061_.gif", "bl00096_.gif", "bl00106_.gif", "bl00107_.gif",
			"bl00108_.gif", "bl00111_.gif", "bl00112_.gif", "bl00113_.gif", "bl00114_.gif",
			"bl00115_.gif", "bl00116_.gif", "bl00117_.gif", "bl00118_.gif", "bl00119_.gif",
			"bl00120_.gif", "bl00121_.gif", "bl00122_.gif", "bl00123_.gif", "bl00124_.gif",
			"bl00125_.gif", "bl00134_.gif", "bl00135_.gif", "bl00136_.gif", "bl00137_.gif",
			"bl00138_.gif", "bl00139_.gif", "bl00140_.gif", "bl00141_.gif", "bl00142_.gif",
			"bl00143_.gif", "bl00144_.gif", "bl00145_.gif", "bl00146_.gif", "bl00150_.gif",
			"bl00177_.gif", "bl00178_.gif", "bl00179_.gif", "bl00180_.gif", "bl00181_.gif",
			"bl00193_.gif", "bl00196_.gif", "bl00197_.gif", "bl00205_.gif", "bl00206_.gif",
			"bl00207_.gif", "bl00211_.gif", "bl00251_.gif", "bl00253_.gif", "tr00069_.gif",
			"tr00071_.gif", "tr00072_.gif", "tr00102_.gif", "tr00104_.gif", "tr00106_.gif",
			"tr00107_.gif", "tr00108_.gif", "tr00109_.gif", "tr00110_.gif", "tr00111_.gif",
			"tr00112_.gif", "tr00113_.gif", "tr00114_.gif", "tr00115_.gif", "tr00116_.gif",
			"tr00117_.gif", "tr00118_.gif", "tr00119_.gif", "tr00123_.gif"
		]
	},
	63: {
		"name": "International",
		"parent": "Rogers Cable : Travel",
		"path": "en-ROGERS/Travel/International",
		"images": [
			"bl00043_.gif", "bl00044_.gif", "bl00046_.gif", "bl00047_.gif", "bl00049_.gif",
			"bl00056_.gif", "bl00060_.gif", "bl00062_.gif", "bl00067_.gif", "bl00068_.gif",
			"bl00069_.gif", "bl00070_.gif", "bl00071_.gif", "bl00072_.gif", "bl00073_.gif",
			"bl00074_.gif", "bl00075_.gif", "bl00076_.gif", "bl00078_.gif", "bl00079_.gif",
			"bl00080_.gif", "bl00097_.gif", "bl00109_.gif", "bl00110_.gif", "bl00149_.gif",
			"bl00153_.gif", "bl00155_.gif", "bl00163_.gif", "bl00164_.gif", "bl00198_.gif",
			"bl00209_.gif", "bl00249_.gif", "pe00330_.gif", "pe00378_.gif", "pe00557_.gif",
			"pe00565_.gif", "pe00618_.gif", "pe00722_.gif", "pe00732_.gif", "pe00736_.gif",
			"pe00756_.gif", "pe00757_.gif", "pe00771_.gif", "pe00807_.gif", "pe00932_.gif",
			"tr00070_.gif", "tr00078_.gif", "tr00079_.gif", "tr00080_.gif", "tr00081_.gif",
			"tr00082_.gif", "tr00105_.gif", "tr00124_.gif"
		]
	},
	64: {
		"name": "Special Occasions",
		"categories": [
			[65, "Celebrate"],
			[66, "Holidays"],
			[67, "Wedding"]
		]			
	},
	65: {
		"name": "Celebrate",
		"parent": "Special Occasions",
		"path": "Special_Occasions/Celebrate",
		"images": [
			"dd00060_.gif", "dd00270_.gif", "pe00584_.gif", "pe00708_.gif", "pe00709_.gif",
			"pe00710_.gif", "pe00711_.gif", "pe00852_.gif", "pe00853_.gif", "pe00854_.gif",
			"pe00942_.gif", "pe00943_.gif", "so00091_.gif", "so00093_.gif", "so00094_.gif",
			"so00095_.gif", "so00097_.gif", "so00098_.gif", "so00100_.gif", "so00101_.gif",
			"so00102_.gif", "so00120_.gif", "so00121_.gif", "so00123_.gif", "so00124_.gif",
			"so00125_.gif", "so00128_.gif", "so00144_.gif", "so00364_.gif", "so00365_.gif",
			"so00368_.gif", "so00369_.gif", "so00370_.gif", "so00371_.gif", "so00372_.gif",
			"so00373_.gif", "so00374_.gif", "so00375_.gif", "so00376_.gif", "so00378_.gif",
			"so00379_.gif", "so00380_.gif", "so00381_.gif", "so00382_.gif", "so00383_.gif",
			"so00386_.gif", "so00387_.gif", "so00390_.gif", "so00391_.gif", "so00392_.gif",
			"so00393_.gif", "so00400_.gif", "so00401_.gif", "so00402_.gif", "so00403_.gif",
			"so00404_.gif", "so00405_.gif", "so00408_.gif", "so00409_.gif", "so00410_.gif",
			"so00431_.gif", "so00433_.gif", "so00434_.gif", "so00435_.gif", "so00436_.gif",
			"so00437_.gif", "so00439_.gif", "so00440_.gif", "so00441_.gif", "so00442_.gif",
			"so00443_.gif", "so00444_.gif", "so00449_.gif", "so00450_.gif", "so00466_.gif",
			"so00467_.gif", "so00468_.gif", "so00469_.gif", "so00476_.gif", "so00478_.gif",
			"so00484_.gif", "so00485_.gif", "so00489_.gif", "so00490_.gif", "so00491_.gif",
			"so00508_.gif", "so00510_.gif", "so00520_.gif", "so00521_.gif", "so00522_.gif",
			"so00525_.gif"
		]
	},
	66: {
		"name": "Holidays",
		"parent": "Special Occasions",
		"path": "Special_Occasions/Holidays",
		"images": [
			"an01040_.gif", "dd00067_.gif", "dd00068_.gif", "dd00242_.gif", "dd00330_.gif",
			"dd00337_.gif", "na00469_.gif", "na00471_.gif", "na00472_.gif", "na00473_.gif",
			"na00474_.gif", "na00475_.gif", "na00476_.gif", "pe00209_.gif", "pe00676_.gif",
			"pe00677_.gif", "pe00678_.gif", "pe00694_.gif", "pe00754_.gif", "pe00940_.gif",
			"sl00174_.gif", "so00087_.gif", "so00088_.gif", "so00089_.gif", "so00103_.gif",
			"so00104_.gif", "so00105_.gif", "so00107_.gif", "so00108_.gif", "so00111_.gif",
			"so00114_.gif", "so00115_.gif", "so00116_.gif", "so00117_.gif", "so00118_.gif",
			"so00119_.gif", "so00126_.gif", "so00127_.gif", "so00129_.gif", "so00130_.gif",
			"so00131_.gif", "so00132_.gif", "so00133_.gif", "so00134_.gif", "so00135_.gif",
			"so00136_.gif", "so00137_.gif", "so00142_.gif", "so00143_.gif", "so00148_.gif",
			"so00149_.gif", "so00151_.gif", "so00358_.gif", "so00359_.gif", "so00361_.gif",
			"so00362_.gif", "so00363_.gif", "so00394_.gif", "so00395_.gif", "so00396_.gif",
			"so00397_.gif", "so00398_.gif", "so00399_.gif", "so00411_.gif", "so00414_.gif",
			"so00415_.gif", "so00422_.gif", "so00423_.gif", "so00424_.gif", "so00427_.gif",
			"so00430_.gif", "so00446_.gif", "so00447_.gif", "so00451_.gif", "so00452_.gif",
			"so00453_.gif", "so00455_.gif", "so00470_.gif", "so00471_.gif", "so00472_.gif",
			"so00473_.gif", "so00474_.gif", "so00475_.gif", "so00480_.gif", "so00481_.gif",
			"so00482_.gif", "so00483_.gif", "so00487_.gif", "so00488_.gif", "so00496_.gif",
			"so00497_.gif", "so00498_.gif", "so00500_.gif", "so00503_.gif", "so00504_.gif",
			"so00505_.gif", "so00506_.gif", "so00511_.gif", "so00514_.gif", "so00516_.gif",
			"so00517_.gif", "so00523_.gif", "so00524_.gif", "so00526_.gif", "so00537_.gif",
			"so00538_.gif", "so00539_.gif", "so00542_.gif"
		]
	},
	67: {
		"name": "Wedding",
		"parent": "Special Occasions",
		"path": "Special_Occasions/Wedding",
		"images": [
			"so00122_.gif", "so00138_.gif", "so00139_.gif", "so00140_.gif", "so00141_.gif",
			"so00456_.gif", "so00457_.gif", "so00458_.gif", "so00459_.gif", "so00460_.gif",
			"so00461_.gif", "so00462_.gif", "so00463_.gif", "so00464_.gif", "so00493_.gif",
			"so00494_.gif", "so00495_.gif", "so00527_.gif", "so00528_.gif", "so00530_.gif",
			"so00531_.gif", "so00534_.gif", "so00536_.gif"
		]
	},
	68: {
		"name": "Sports",
		"categories": [
			[69, "Baseball"],
			[70, "Basketball"],
			[71, "Football"],
			[72, "Golf"],
			[73, "Other"],
			[74, "Soccer"],
			[75, "Water"],
			[76, "Winter"],
			[77, "Workout"]
		]
	},
	69: {
		"name": "Baseball",
		"parent": "Sports",
		"path": "Sports/Baseball",
		"images": [
			"pe00160_.gif", "pe00161_.gif", "pe00198_.gif", "pe00218_.gif", "pe00388_.gif",
			"pe00586_.gif", "sl00123_.gif", "sl00124_.gif", "sl00125_.gif", "sl00126_.gif",
			"sl00127_.gif", "sl00264_.gif", "sl00265_.gif", "sl00266_.gif", "sl00271_.gif"
		]
	},
	70: {
		"name": "Basketball",
		"parent": "Sports",
		"path": "Sports/Basketball",
		"images": [
			"pe00190_.gif", "pe00191_.gif", "pe00192_.gif", "pe00606_.gif", "pe00607_.gif",
			"pe00608_.gif", "sl00141_.gif", "sl00142_.gif", "sl00157_.gif", "sl00274_.gif",
			"sl00275_.gif", "sl00276_.gif", "sl00277_.gif", "sl00278_.gif", "sl00280_.gif"
		]
	},
	71: {
		"name": "Football",
		"parent": "Sports",
		"path": "Sports/Football",
		"images": [
			"pe00263_.gif", "pe00264_.gif", "pe00682_.gif", "pe00684_.gif", "sl00167_.gif",
			"sl00168_.gif", "sl00291_.gif", "sl00292_.gif", "sl00293_.gif", "sl00295_.gif",
			"sl00296_.gif", "sl00297_.gif", "sl00338_.gif"
		]
	},
	72: {
		"name": "Golf",
		"parent": "Sports",
		"path": "Sports/Golf",
		"images": [
			"pe00283_.gif", "pe00286_.gif", "pe00287_.gif", "pe00705_.gif", "pe00706_.gif",
			"pe00707_.gif", "sl00149_.gif", "sl00170_.gif", "sl00171_.gif", "sl00172_.gif",
			"sl00173_.gif", "sl00300_.gif", "sl00301_.gif", "sl00302_.gif"
		]
	},
	73: {
		"name": "Other",
		"parent": "Sports",
		"path": "Sports/Other",
		"images": [
			"dd00226_.gif", "pe00193_.gif", "pe00194_.gif", "pe00207_.gif", "pe00220_.gif",
			"pe00262_.gif", "pe00265_.gif", "pe00295_.gif", "pe00296_.gif", "pe00297_.gif",
			"pe00298_.gif", "pe00299_.gif", "pe00300_.gif", "pe00308_.gif", "pe00309_.gif",
			"pe00310_.gif", "pe00311_.gif", "pe00372_.gif", "pe00373_.gif", "pe00377_.gif",
			"pe00379_.gif", "pe00380_.gif", "pe00411_.gif", "pe00412_.gif", "pe00413_.gif",
			"pe00414_.gif", "pe00422_.gif", "pe00431_.gif", "pe00433_.gif", "pe00434_.gif",
			"pe00435_.gif", "pe00439_.gif", "pe00441_.gif", "pe00587_.gif", "pe00588_.gif",
			"pe00603_.gif", "pe00621_.gif", "pe00622_.gif", "pe00670_.gif", "pe00714_.gif",
			"pe00738_.gif", "pe00739_.gif", "pe00740_.gif", "pe00741_.gif", "pe00742_.gif",
			"pe00743_.gif", "pe00745_.gif", "pe00746_.gif", "pe00764_.gif", "pe00861_.gif",
			"pe00880_.gif", "pe00894_.gif", "pe00902_.gif", "pe00903_.gif", "pe00918_.gif",
			"pe00919_.gif", "pe00920_.gif", "pe00931_.gif", "sl00120_.gif", "sl00121_.gif",
			"sl00122_.gif", "sl00128_.gif", "sl00129_.gif", "sl00130_.gif", "sl00131_.gif",
			"sl00132_.gif", "sl00133_.gif", "sl00135_.gif", "sl00136_.gif", "sl00137_.gif",
			"sl00138_.gif", "sl00139_.gif", "sl00140_.gif", "sl00148_.gif", "sl00150_.gif",
			"sl00151_.gif", "sl00152_.gif", "sl00153_.gif", "sl00154_.gif", "sl00155_.gif",
			"sl00156_.gif", "sl00158_.gif", "sl00159_.gif", "sl00166_.gif", "sl00194_.gif",
			"sl00195_.gif", "sl00196_.gif", "sl00197_.gif", "sl00198_.gif", "sl00199_.gif",
			"sl00200_.gif", "sl00201_.gif", "sl00202_.gif", "sl00203_.gif", "sl00216_.gif",
			"sl00217_.gif", "sl00220_.gif", "sl00222_.gif", "sl00223_.gif", "sl00224_.gif",
			"sl00225_.gif", "sl00226_.gif", "sl00227_.gif", "sl00228_.gif", "sl00229_.gif",
			"sl00230_.gif", "sl00231_.gif", "sl00232_.gif", "sl00233_.gif", "sl00234_.gif",
			"sl00262_.gif", "sl00263_.gif", "sl00269_.gif", "sl00270_.gif", "sl00281_.gif",
			"sl00282_.gif", "sl00309_.gif", "sl00311_.gif", "sl00312_.gif", "sl00313_.gif",
			"sl00314_.gif", "sl00315_.gif", "sl00316_.gif", "sl00317_.gif", "sl00324_.gif",
			"sl00327_.gif", "sl00343_.gif"
		]
	},
	74: {
		"name": "Soccer",
		"parent": "Sports",
		"path": "Sports/Soccer",
		"images": [
			"pe00404_.gif", "pe00405_.gif", "pe00406_.gif", "sl00218_.gif", "sl00219_.gif",
			"sl00331_.gif", "sl00332_.gif", "sl00334_.gif", "sl00335_.gif", "sl00336_.gif",
			"sl00337_.gif"
		]
	},
	75: {
		"name": "Water",
		"parent": "Sports",
		"path": "Sports/Water",
		"images": [
			"an00956_.gif", "an00957_.gif", "pe00206_.gif", "pe00239_.gif", "pe00403_.gif",
			"pe00416_.gif", "pe00417_.gif", "pe00437_.gif", "pe00671_.gif", "pe00672_.gif",
			"pe00873_.gif", "pe00874_.gif", "pe00895_.gif", "pe00912_.gif", "pe00913_.gif",
			"pe00941_.gif", "sl00146_.gif", "sl00147_.gif", "sl00160_.gif", "sl00161_.gif",
			"sl00162_.gif", "sl00163_.gif", "sl00164_.gif", "sl00165_.gif", "sl00178_.gif",
			"sl00185_.gif", "sl00186_.gif", "sl00204_.gif", "sl00205_.gif", "sl00206_.gif",
			"sl00207_.gif", "sl00208_.gif", "sl00209_.gif", "sl00210_.gif", "sl00211_.gif",
			"sl00212_.gif", "sl00213_.gif", "sl00214_.gif", "sl00236_.gif", "sl00237_.gif",
			"sl00238_.gif", "sl00239_.gif", "sl00240_.gif", "sl00241_.gif", "sl00242_.gif",
			"sl00307_.gif", "sl00320_.gif", "sl00321_.gif", "sl00322_.gif", "sl00323_.gif",
			"sl00339_.gif", "sl00349_.gif", "sl00350_.gif"
		]
	},
	76: {
		"name": "Winter",
		"parent": "Sports",
		"path": "Sports/Winter",
		"images": [
			"pe00302_.gif", "pe00393_.gif", "pe00395_.gif", "pe00396_.gif", "pe00397_.gif",
			"pe00398_.gif", "pe00399_.gif", "pe00400_.gif", "pe00401_.gif", "pe00724_.gif",
			"pe00881_.gif", "pe00882_.gif", "pe00883_.gif", "pe00884_.gif", "pe00885_.gif",
			"pe00886_.gif", "pe00887_.gif", "pe00888_.gif", "pe00889_.gif", "pe00890_.gif",
			"pe00891_.gif", "pe00892_.gif", "sl00175_.gif", "sl00176_.gif", "sl00189_.gif",
			"sl00215_.gif", "sl00304_.gif", "sl00305_.gif", "sl00306_.gif", "sl00326_.gif"
		]
	},
	77: {
		"name": "Workout",
		"parent": "Sports",
		"path": "Sports/Workout",
		"images": [
			"pe00151_.gif", "pe00158_.gif", "pe00221_.gif", "pe00408_.gif", "pe00864_.gif",
			"pe00865_.gif", "pe00904_.gif", "pe00905_.gif", "pe00944_.gif", "pe00946_.gif",
			"pe00947_.gif", "pe00948_.gif", "pe00949_.gif", "pe00950_.gif", "pe00951_.gif",
			"pe00957_.gif", "sl00303_.gif", "sl00341_.gif", "sl00342_.gif"
		]
	},
	78: {
		"name": "Symbols",
		"path": "Symbols",
		"images": [
			"WTV_rt_1.gif", "WTV_rt_2.gif", "WTV_rt_3.gif", "WTV_sq_1.gif", "WTV_sq_2.gif",
			"WTV_sq_3.gif", "pe00314_.gif", "pe00602_.gif", "pe00729_.gif", "pe00730_.gif",
			"sg00013_.gif", "sg00014_.gif", "sg00015_.gif", "sg00019_.gif", "sg00026_.gif",
			"sg00028_.gif", "sl00177_.gif", "sl00179_.gif", "sl00180_.gif", "sl00181_.gif",
			"sl00182_.gif", "sl00183_.gif", "sl00184_.gif", "sp00001_.gif", "sp00002_.gif",
			"sy00056_.gif", "sy00057_.gif", "sy00058_.gif", "sy00059_.gif", "sy00060_.gif",
			"sy00061_.gif", "sy00062_.gif", "sy00063_.gif", "sy00064_.gif", "sy00065_.gif",
			"sy00066_.gif", "sy00067_.gif", "sy00069_.gif", "sy00070_.gif", "sy00071_.gif",
			"sy00076_.gif", "sy00077_.gif", "sy00078_.gif", "sy00090_.gif", "sy00093_.gif",
			"sy00107_.gif", "sy00111_.gif", "sy00112_.gif", "sy00123_.gif", "sy00125_.gif",
			"sy00128_.gif", "sy00131_.gif", "sy00132_.gif", "sy00133_.gif", "sy00134_.gif",
			"sy00142_.gif", "sy00144_.gif", "sy00145_.gif", "sy00148_.gif", "sy00149_.gif",
			"sy00150_.gif", "sy00151_.gif", "sy00152_.gif", "sy00153_.gif", "sy00154_.gif",
			"sy00155_.gif", "sy00159_.gif", "sy00165_.gif", "sy00168_.gif", "sy00169_.gif",
			"sy00170_.gif"
		]
	},
	79: {
		"name": "Transportation",
        "categories": [
            [80, "Air"],
            [81, "Land"],
            [82, "Sea"]
        ]
	},
	80: {
		"name": "Air",
		"parent": "Transportation",
		"path": "Transportation/Air",
		"images": [
			"in00024_.gif", "in00025_.gif", "in00026_.gif", "in00027_.gif", "in00028_.gif",
			"in00029_.gif", "in00030_.gif", "in00031_.gif", "in00032_.gif", "in00033_.gif",
			"in00034_.gif", "in00035_.gif", "in00037_.gif", "in00038_.gif", "in00039_.gif",
			"in00040_.gif", "in00041_.gif", "in00042_.gif", "in00043_.gif", "in00044_.gif",
			"in00045_.gif", "in00046_.gif", "in00105_.gif", "in00106_.gif", "in00107_.gif",
			"in00108_.gif", "in00110_.gif", "in00111_.gif", "in00113_.gif", "in00114_.gif",
			"in00115_.gif", "in00116_.gif", "in00123_.gif", "in00124_.gif", "in00127_.gif",
			"in00128_.gif", "in00130_.gif", "in00131_.gif", "in00132_.gif", "in00133_.gif",
			"in00134_.gif", "in00135_.gif", "in00136_.gif", "in00137_.gif", "in00138_.gif",
			"in00225_.gif", "sl00116_.gif", "sl00117_.gif", "sl00118_.gif", "sl00119_.gif",
			"tn00068_.gif", "tn00069_.gif", "tn00070_.gif", "tn00117_.gif", "tn00121_.gif",
			"tn00130_.gif", "tn00131_.gif", "tn00132_.gif", "tn00133_.gif", "tn00139_.gif",
			"tn00140_.gif", "tn00141_.gif", "tn00142_.gif", "tn00143_.gif", "tn00188_.gif",
			"tn00189_.gif", "tn00190_.gif", "tn00209_.gif", "tn00210_.gif", "tn00225_.gif",
			"tn00226_.gif", "tn00235_.gif", "tn00236_.gif", "tn00237_.gif", "tn00239_.gif"
		]		
	},
	81: {
		"name": "Land",
		"parent": "Transportation",
		"path": "Transportation/Land",
		"images": [
			"in00184_.gif", "in00185_.gif", "in00186_.gif", "in00187_.gif", "in00188_.gif",
			"in00190_.gif", "in00191_.gif", "in00192_.gif", "in00193_.gif", "in00194_.gif",
			"in00195_.gif", "in00196_.gif", "sg00027_.gif", "tn00075_.gif", "tn00076_.gif",
			"tn00077_.gif", "tn00078_.gif", "tn00080_.gif", "tn00081_.gif", "tn00082_.gif",
			"tn00083_.gif", "tn00084_.gif", "tn00086_.gif", "tn00087_.gif", "tn00088_.gif",
			"tn00089_.gif", "tn00090_.gif", "tn00091_.gif", "tn00092_.gif", "tn00093_.gif",
			"tn00094_.gif", "tn00095_.gif", "tn00096_.gif", "tn00097_.gif", "tn00098_.gif",
			"tn00099_.gif", "tn00100_.gif", "tn00101_.gif", "tn00102_.gif", "tn00103_.gif",
			"tn00105_.gif", "tn00107_.gif", "tn00109_.gif", "tn00110_.gif", "tn00111_.gif",
			"tn00118_.gif", "tn00119_.gif", "tn00125_.gif", "tn00126_.gif", "tn00127_.gif",
			"tn00128_.gif", "tn00129_.gif", "tn00161_.gif", "tn00162_.gif", "tn00163_.gif",
			"tn00165_.gif", "tn00166_.gif", "tn00167_.gif", "tn00168_.gif", "tn00169_.gif",
			"tn00171_.gif", "tn00172_.gif", "tn00173_.gif", "tn00174_.gif", "tn00175_.gif",
			"tn00176_.gif", "tn00178_.gif", "tn00179_.gif", "tn00181_.gif", "tn00182_.gif",
			"tn00183_.gif", "tn00184_.gif", "tn00185_.gif", "tn00211_.gif", "tn00212_.gif",
			"tn00213_.gif", "tn00214_.gif", "tn00216_.gif", "tn00217_.gif", "tn00218_.gif",
			"tn00219_.gif", "tn00222_.gif", "tn00223_.gif", "tn00229_.gif", "tn00230_.gif",
			"tn00240_.gif", "tn00241_.gif", "tn00242_.gif", "tn00250_.gif", "tn00251_.gif",
			"tn00252_.gif", "tn00254_.gif", "tn00256_.gif", "tn00257_.gif", "tn00258_.gif",
			"tn00259_.gif", "tn00260_.gif", "tn00261_.gif", "tn00262_.gif", "tn00263_.gif"
		]
	},
	82: {
		"name": "Sea",
		"parent": "Transportation",
		"path": "Transportation/Sea",
		"images": [
			"tn00071_.gif", "tn00072_.gif", "tn00073_.gif", "tn00074_.gif", "tn00104_.gif",
			"tn00112_.gif", "tn00113_.gif", "tn00114_.gif", "tn00115_.gif", "tn00116_.gif",
			"tn00120_.gif", "tn00123_.gif", "tn00136_.gif", "tn00137_.gif", "tn00138_.gif",
			"tn00145_.gif", "tn00146_.gif", "tn00147_.gif", "tn00148_.gif", "tn00149_.gif",
			"tn00150_.gif", "tn00151_.gif", "tn00152_.gif", "tn00153_.gif", "tn00155_.gif",
			"tn00156_.gif", "tn00157_.gif", "tn00158_.gif", "tn00159_.gif", "tn00245_.gif",
			"tn00246_.gif", "tn00247_.gif", "tn00264_.gif", "tn00265_.gif", "tn00266_.gif",
			"tr00073_.gif", "tr00075_.gif"
		]
	},
	83: {
		"name": "Travel",
		"categories": [
			[84, "City_Scenes"],
			[85, "Domestic"],
			[86, "International"],
			[87, "Landmarks"],
			[88, "Luggage & Docs"]
		]
	},
	84: {
		"name": "City_Scenes",
		"parent": "Travel",
		"path": "Travel/City_Scenes",
		"images": [
			"bl00086_.gif", "bl00087_.gif", "bl00088_.gif", "bl00089_.gif", "bl00099_.gif",
			"bl00100_.gif", "bl00101_.gif", "bl00102_.gif", "bl00103_.gif", "bl00104_.gif",
			"bl00105_.gif", "bl00151_.gif", "bl00162_.gif", "bl00168_.gif", "bl00169_.gif",
			"bl00170_.gif", "bl00171_.gif", "bl00172_.gif", "bl00173_.gif", "bl00174_.gif",
			"bl00175_.gif", "bl00176_.gif", "bl00194_.gif", "bl00195_.gif", "bl00218_.gif",
			"bl00239_.gif", "bl00240_.gif", "bl00286_.gif"
		]
	},
	85: {
		"name": "Domestic",
		"parent": "Travel",
		"path": "Travel/Domestic",
		"images": [
			"bl00043_.gif", "bl00044_.gif", "bl00045_.gif", "bl00048_.gif", "bl00055_.gif",
			"bl00056_.gif", "bl00057_.gif", "bl00058_.gif", "bl00059_.gif", "bl00061_.gif",
			"bl00096_.gif", "bl00106_.gif", "bl00107_.gif", "bl00108_.gif", "bl00109_.gif",
			"bl00111_.gif", "bl00112_.gif", "bl00113_.gif", "bl00114_.gif", "bl00115_.gif",
			"bl00116_.gif", "bl00117_.gif", "bl00118_.gif", "bl00119_.gif", "bl00120_.gif",
			"bl00121_.gif", "bl00122_.gif", "bl00123_.gif", "bl00124_.gif", "bl00125_.gif",
			"bl00134_.gif", "bl00135_.gif", "bl00136_.gif", "bl00137_.gif", "bl00138_.gif",
			"bl00139_.gif", "bl00140_.gif", "bl00143_.gif", "bl00144_.gif", "bl00145_.gif",
			"bl00146_.gif", "bl00150_.gif", "bl00155_.gif", "bl00177_.gif", "bl00178_.gif",
			"bl00179_.gif", "bl00180_.gif", "bl00181_.gif", "bl00193_.gif", "bl00196_.gif",
			"bl00197_.gif", "bl00205_.gif", "bl00206_.gif", "bl00207_.gif", "bl00211_.gif",
			"bl00251_.gif", "bl00253_.gif", "tr00069_.gif", "tr00070_.gif", "tr00071_.gif",
			"tr00072_.gif", "tr00078_.gif", "tr00102_.gif", "tr00104_.gif", "tr00105_.gif",
			"tr00106_.gif", "tr00107_.gif", "tr00108_.gif", "tr00109_.gif", "tr00110_.gif",
			"tr00111_.gif", "tr00112_.gif", "tr00113_.gif", "tr00114_.gif", "tr00115_.gif",
			"tr00116_.gif", "tr00117_.gif", "tr00118_.gif", "tr00119_.gif", "tr00123_.gif"
		]
	},
	86: {
		"name": "International",
		"parent": "Travel",
		"path": "Travel/International",
		"images": [
			"bl00046_.gif", "bl00047_.gif", "bl00049_.gif", "bl00060_.gif", "bl00062_.gif",
			"bl00067_.gif", "bl00068_.gif", "bl00069_.gif", "bl00070_.gif", "bl00071_.gif",
			"bl00072_.gif", "bl00073_.gif", "bl00074_.gif", "bl00075_.gif", "bl00076_.gif",
			"bl00078_.gif", "bl00079_.gif", "bl00080_.gif", "bl00097_.gif", "bl00110_.gif",
			"bl00141_.gif", "bl00142_.gif", "bl00149_.gif", "bl00153_.gif", "bl00163_.gif",
			"bl00164_.gif", "bl00198_.gif", "bl00209_.gif", "bl00249_.gif", "pe00330_.gif",
			"pe00378_.gif", "pe00557_.gif", "pe00565_.gif", "pe00618_.gif", "pe00722_.gif",
			"pe00732_.gif", "pe00736_.gif", "pe00756_.gif", "pe00757_.gif", "pe00771_.gif",
			"pe00807_.gif", "pe00932_.gif", "tr00079_.gif", "tr00080_.gif", "tr00081_.gif",
			"tr00082_.gif", "tr00124_.gif"
		]
	},
	87: {
		"name": "Landmarks",
		"parent": "Travel",
		"path": "Travel/Landmarks",
		"images": [
			"bl00064_.gif", "bl00066_.gif", "bl00077_.gif", "bl00081_.gif", "bl00082_.gif",
			"bl00083_.gif", "bl00084_.gif", "bl00092_.gif", "bl00093_.gif", "bl00094_.gif",
			"bl00095_.gif", "bl00156_.gif", "bl00158_.gif", "bl00159_.gif", "bl00160_.gif",
			"bl00161_.gif", "bl00182_.gif", "bl00185_.gif", "bl00186_.gif", "bl00187_.gif",
			"bl00188_.gif", "bl00189_.gif", "bl00190_.gif", "bl00191_.gif", "bl00192_.gif",
			"bl00199_.gif", "bl00200_.gif", "bl00201_.gif", "bl00202_.gif", "bl00203_.gif",
			"bl00204_.gif", "bl00212_.gif", "bl00213_.gif", "bl00215_.gif", "bl00216_.gif",
			"bl00250_.gif", "bl00271_.gif", "bl00290_.gif", "tr00089_.gif", "tr00127_.gif"
		]
	},
	88: {
		"name": "Luggage & Docs",
		"parent": "Travel",
		"path": "Travel/Luggage_n_Docs",
		"images": [
			"tr00076_.gif", "tr00077_.gif", "tr00083_.gif", "tr00084_.gif", "tr00085_.gif",
			"tr00086_.gif", "tr00087_.gif", "tr00098_.gif", "tr00100_.gif", "tr00101_.gif",
			"tr00120_.gif", "tr00122_.gif", "tv00001_.gif"
		]
	}
}


headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

function hasImages(i) {
	return (clipart[i].images) ? true : false;
}


if (!category || !hasImages(category)) {
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
function GoBackToUrl(gvnStr) {
foundInBackList = false;
for (i=history.length-1; i >= 0; i--) {	if (history[i].indexOf(gvnStr) != -1) {	foundInBackList = true;
break;
}
}
if (foundInBackList) {	history.go(i-history.length+1);
return true;
}
else
return false;
}
function DoDone()
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href=javascript:DoDone()
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Done</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
>
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=37 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=5>
<font color=AEBFD1> Choose a category of
${(category !== null) ? `<b>${clipart[category].name}</b>` : 'art'} </font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=1>
`;
	if (category !== null) {
		var cat = clipart[category];
		if (cat.categories) {
			var i = 0;
			Object.keys(cat.categories).forEach(function (k) {
				i++;
				if (i % 14 === 0) data += `</table></td><td valign=top><table cellspacing=0 cellpadding=1>`;
				data += `
	<tr>
	<td>
	<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
		<a href=wtv-author:clipbook?mediaCategoryID=${cat.categories[k][0]}&docName=${docName}&blockNum=${blockNum}><font effect=shadow><B>${cat.categories[k][1]}</B></font></a>
	</td>
	</tr>
`;
			});
		}
	} else {
		var i = 0;
		Object.keys(clipart).forEach(function (k) {
			cat = clipart[k];
			if (cat.parent) return;
			i++;
			if (i % 14 === 0) data += `</table></td><td valign=top><table cellspacing=0 cellpadding=1>`;
			data += `
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=${k}&docName=${docName}&blockNum=${blockNum}><font effect=shadow><B>${cat.name}</B></font></a>
</td>
</tr>
`;
		});
	}
	data += `</table>
</BODY>
</HTML>`
} else {
	// category has images
	var cat = clipart[category];
	var imgcount = cat.images.length;
	var pages = Math.ceil(imgcount / itemsPerPage);

	data = `<HTML><HEAD>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery</TITLE>
<SCRIPT language="JavaScript">
function AddToClipbook()
{	document.theForm.submit();
open();
}
function GoBackToUrl(gvnStr) {
foundInBackList = false;
for (i=history.length-1; i >= 0; i--) {	if (history[i].indexOf(gvnStr) != -1) {	foundInBackList = true;
break;
}
}
if (foundInBackList) {	history.go(i-history.length+1);
return true;
}
else
return false;
}
function DoDone()
{	GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="wtv-home:/ROMCache/WebTVLogoJewel.gif" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-author:clipbook?blockClass=23&docName=${docName}&blockNum=${blockNum}"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Index</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href=javascript:void(DoDone())
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Done</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
>
<form action="wtv-author:/clipbook-setLastPage">
<input type=hidden name="pageNum" value="${page}" autosubmit=onEnter>
<input type=hidden name=mediaCategoryID value="0">
</form>
<table cellspacing=0 cellpadding=0 width=100%>
<tr>
<td height=44 width=206 valign=middle>
<font size=+1 color=D1D1D1><blackface> Art Gallery </blackface></font>
<td align=right valign=middle>
<table valign=middle>
<tr>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:clipbook?docName=${docName}&blockNum=${blockNum}&mediaCategoryID=${category}&pageNum=${ (page > 0) ? (page - 1) : (pages - 1)}#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif"></table>
</td>
<td align=center><font color=D1D1D1><B>${page+1} of ${pages}</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:clipbook?docName=${docName}&blockNum=${blockNum}&mediaCategoryID=${category}&pageNum=${(page + 1 < pages) ? `${page + 1}` : '0'}#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif"></table>
</td>
</tr>
</table>
<tr>
<td colspan=2>`;
	if (cat.parent) data += cat.parent + " : ";
	data += `
${cat.name}
<tr>
<td height=10>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose an image to add to your Web page </font>
</table>
<CENTER>
<TABLE cellspacing=0 cellpadding=0 align=center>
<TR height=8>
<TD width=10 height=8></TD>
<TD bgcolor=#8A99B0 width=2 rowspan=7></TD>
<TD width=10 background=wtv-author:/ROMCache/horiz_line.gif>
<IMG src=wtv-author:/ROMCache/left_arrow.gif> </TD>
<TD valign=middle height=8 background=wtv-author:/ROMCache/horiz_line.gif>
<spacer type=block height=1 width=1></TD>
<TD width=10 align=right background=wtv-author:/ROMCache/horiz_line.gif>
<IMG src=wtv-author:/ROMCache/right_arrow.gif> </TD>
<TD bgcolor=#8A99B0 width=2 rowspan=7></TD>
<TD width=10></TD>
</TR>
<TR height=2>
<TD bgcolor=#8A99B0 height=2 colspan=7></TD>
</TR>
<TR height=10>
<TD absheight=10 width=10 valign=top background=wtv-author:/ROMCache/vert_line.gif>
<IMG src=wtv-author:/ROMCache/up_arrow.gif> </TD>
<TD colspan=3 rowspan=3 align=center>
<table cellspacing=14 cellpadding=0 background="/ROMCache/light_blue_tile.gif">
`;
	for (i = page * itemsPerPage; i < Math.min(imgcount, (page + 1) * itemsPerPage); i++) {
		if (i % 4 === 0) data += `<tr>`;
		data += `
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=${docName}&blockNum=${blockNum}&blockClass=23&mediaPath=clipart%2F${escape(cat.path + "/" + cat.images[i])}&thumbnailPath=clipart%2Ficons%2F${escape(cat.path + "/" + cat.images[i])}">
<img src="clipart/icons/${cat.path}/${cat.images[i]}" width=64 height=64>
</td>`;
	}
data += `
</table>
</TD>
</TR>
<TR>
<TD align=center width=10 background=wtv-author:/ROMCache/vert_line.gif></TD>
</TR>
<TR height=10>
<TD absheight=10 width=10 valign=bottom background=wtv-author:/ROMCache/vert_line.gif><IMG src=wtv-author:/ROMCache/down_arrow.gif> </TD>
<TD width=10></TD>
</TR>
<TR height=2>
<TD bgcolor=#8A99B0 height=2 colspan=7></TD>
</TR>
<TR height=8>
<TD height=8></TD>
</TR>
</TABLE>
</CENTER>
</BODY>
</HTML>`;

}