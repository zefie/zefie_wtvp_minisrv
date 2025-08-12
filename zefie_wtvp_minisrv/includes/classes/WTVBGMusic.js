
class WTVBGMusic {

    minisrv_config = null;
    session_data = null;
    wtvshared = null;
    categories = [
        "Ambient",
        "Classical",
        "Classical-Bach",
        "Funk",
        "Pop",
        "Jazz",
        "Keyboards",
        "Techno",
        "More Techno",
        "Ragtime",
        "World",
        "Upbeat",
        "Mellow",
        "Underground",
        "Video Games",
        "zefie's Choice"
    ]
    musiclist_classic = {
        "100": {
            "title": "Dream Anime",
            "url": "wtv-music:/music/ambient/trance/dreamanime.mid"
        },
        "101": {
            "title": "Desert",
            "url": "wtv-music:/music/ambient/desert/desert.mid"
        },
        "102": {
            "title": "Alexandra's Apple",
            "url": "wtv-music:/music/ambient/trance/alexandras.mid"
        },
        "103": {
            "title": "Jimmy",
            "url": "wtv-music:/music/ambient/jimmy/jimmy.mid"
        },
        "104": {
            "title": "Morpheus",
            "url": "wtv-music:/music/ambient/eno/eno.mid"
        },
        "105": {
            "title": "Wind Chime Days",
            "url": "wtv-music:/music/ambient/windchim/windchime.mid"
        },
        "200": {
            "title": "Ave Maria",
            "url": "wtv-music:/music/classicl/french_romantic/gounod_avemaria.mid"
        },
        "201": {
            "title": "Beethoven's 5th",
            "url": "wtv-music:/music/classicl/beet/beethoven.mid"
        },
        "202": {
            "title": "Beethoven's 8th",
            "url": "wtv-music:/music/classicl/beet/beethoven_8th_2mov.mid"
        },
        "203": {
            "title": "Clair de Lune",
            "url": "wtv-music:/music/classicl/french_impressionists/debussey_clairdelune.mid"
        },
        "204": {
            "title": "Flight of the Bumblebee",
            "url": "wtv-music:/music/classicl/popular/flight_of_the_bumble_bee.mid"
        },
        "205": {
            "title": "Gymnopedie",
            "url": "wtv-music:/music/classicl/french_impressionists/satie_gymnopedie1.mid"
        },
        "206": {
            "title": "Haydn",
            "url": "wtv-music:/music/classicl/haydn104/haydn.mid"
        },
        "207": {
            "title": "Moonlight sonata",
            "url": "wtv-music:/music/classicl/beet/beethoven_moonlight.mid"
        },
        "208": {
            "title": "Mozart",
            "url": "wtv-music:/music/classicl/mozart1/mozart1.mid"
        },
        "209": {
            "title": "Pachebel Canon",
            "url": "wtv-music:/music/classicl/baroque/pachebel_canon.mid"
        },
        "210": {
            "title": "Pathetique sonata",
            "url": "wtv-music:/music/classicl/beet/beethoven_pathetique.mid"
        },
        "211": {
            "title": "Pavanne for a Dead Princess",
            "url": "wtv-music:/music/classicl/french_impressionists/ravel_pavanne.mid"
        },
        "300": {
            "title": "C-major prelude",
            "url": "wtv-music:/music/classicl/bach/bach_cmaj_prelude.mid"
        },
        "301": {
            "title": "C-major fugue",
            "url": "wtv-music:/music/classicl/bach/bach_fugue_cmajor.mid"
        },
        "302": {
            "title": "C-minor fugue",
            "url": "wtv-music:/music/classicl/bach/bach_fugue_cminor.mid"
        },
        "303": {
            "title": "Eb-major fugue",
            "url": "wtv-music:/music/classicl/bach/bach_fugue_eflatMajor.mid"
        },
        "304": {
            "title": "D-minor invention",
            "url": "wtv-music:/music/classicl/bach/bach_dminor_2part_invention.mid"
        },
        "305": {
            "title": "Little fugue",
            "url": "wtv-music:/music/classicl/bach/bach_little_fugue.mid"
        },
        "306": {
            "title": "Minuet in G",
            "url": "wtv-music:/music/classicl/bach/bach_menuet_in_G.mid"
        },
        "307": {
            "title": "Violin partita in E",
            "url": "wtv-music:/music/classicl/bach/bach_violin_partita_in_e.mid"
        },
        "400": {
            "title": "Jet Set",
            "url": "wtv-music:/music/swingey-jazzy/jetset.mid"
        },
        "401": {
            "title": "Low Jinx",
            "url": "wtv-music:/music/swingey-jazzy/lowjinx.mid"
        },
        "402": {
            "title": "Papa's Old Shop",
            "url": "wtv-music:/music/swingey-jazzy/oldshop.mid"
        },
        "403": {
            "title": "Acey",
            "url": "wtv-music:/music/funky/acey/acey.mid"
        },
        "404": {
            "title": "Funky",
            "url": "wtv-music:/music/funky/funkyass/funky.mid"
        },
        "405": {
            "title": "Groovy",
            "url": "wtv-music:/music/funky/groovy/groovy.mid"
        },
        "500": {
            "title": "Chill Jingle",
            "url": "wtv-music:/music/pop/chilljngl/chill_jingle.mid"
        },
        "501": {
            "title": "Cool Shades",
            "url": "wtv-music:/music/newmusic/pop2/CoolShad.mid"
        },
        "502": {
            "title": "Flute Boy",
            "url": "wtv-music:/music/newmusic/pop2/flutey.mid"
        },
        "503": {
            "title": "Georgy",
            "url": "wtv-music:/music/newmusic/pop2/georgy.mid"
        },
        "504": {
            "title": "Glasses",
            "url": "wtv-music:/music/newmusic/pop2/Glasses.mid"
        },
        "505": {
            "title": "House",
            "url": "wtv-music:/music/pop/house/house.mid"
        },
        "506": {
            "title": "Jazzin'",
            "url": "wtv-music:/music/newmusic/pop2/Jazzin.mid"
        },
        "507": {
            "title": "Jazzscape",
            "url": "wtv-music:/music/newmusic/pop2/jscape.mid"
        },
        "508": {
            "title": "Popster",
            "url": "wtv-music:/music/pop/house/popster.mid"
        },
        "509": {
            "title": "Relief",
            "url": "wtv-music:/music/pop/relief/relief.mid"
        },
        "510": {
            "title": "Royal",
            "url": "wtv-music:/music/pop/royal/royal.mid"
        },
        "511": {
            "title": "So Grand",
            "url": "wtv-music:/music/newmusic/pop2/sogrand.mid"
        },
        "512": {
            "title": "Tasty Wave",
            "url": "wtv-music:/music/newmusic/pop2/tastywav.mid"
        },
        "600": {
            "title": "Come On In",
            "url": "wtv-music:/music/newmusic/jazz/ComeOnInn.mid"
        },
        "601": {
            "title": "Downtown",
            "url": "wtv-music:/music/newmusic/jazz/Downtown.mid"
        },
        "602": {
            "title": "Huffin Puffin",
            "url": "wtv-music:/music/newmusic/jazz/HuffinPuffin.mid"
        },
        "603": {
            "title": "I Can't Wait",
            "url": "wtv-music:/music/newmusic/jazz/ICantWait.mid"
        },
        "604": {
            "title": "Liz and Larry",
            "url": "wtv-music:/music/newmusic/jazz/Liz-N-Larry.mid"
        },
        "605": {
            "title": "Missin' Summer",
            "url": "wtv-music:/music/newmusic/jazz/MissinSummer.mid"
        },
        "606": {
            "title": "Oh, I'm On Fire",
            "url": "wtv-music:/music/newmusic/jazz/OhImOnFire.mid"
        },
        "607": {
            "title": "Park It Here",
            "url": "wtv-music:/music/newmusic/jazz/ParkItHere.mid"
        },
        "608": {
            "title": "Slow Day",
            "url": "wtv-music:/music/newmusic/jazz/SlowDay.mid"
        },
        "609": {
            "title": "Swing Set",
            "url": "wtv-music:/music/newmusic/jazz/SwingSet.mid"
        },
        "610": {
            "title": "Let's Play Ball",
            "url": "wtv-music:/music/newmusic/jazz/LetsPlayBall.mid"
        },
        "611": {
            "title": "Mr. Chop Chop",
            "url": "wtv-music:/music/newmusic/jazz/MrChopChop.mid"
        },
        "700": {
            "title": "Catacombs",
            "url": "wtv-music:/music/newmusic/keyboards/cata_wtv.mid"
        },
        "701": {
            "title": "At Home",
            "url": "wtv-music:/music/newmusic/keyboards/home_wtv.mid"
        },
        "702": {
            "title": "Just",
            "url": "wtv-music:/music/newmusic/keyboards/just_wtv.mid"
        },
        "703": {
            "title": "Good 'Nite",
            "url": "wtv-music:/music/newmusic/keyboards/nite_wtv.mid"
        },
        "704": {
            "title": "Piano Jazz 1",
            "url": "wtv-music:/music/newmusic/pop2/pnojazz1.mid"
        },
        "705": {
            "title": "Piano Jazz 2",
            "url": "wtv-music:/music/newmusic/pop2/pnojazz2.mid"
        },
        "706": {
            "title": "Shreaded Paper",
            "url": "wtv-music:/music/newmusic/keyboards/shre_wtv.mid"
        },
        "707": {
            "title": "Travelin'",
            "url": "wtv-music:/music/newmusic/keyboards/trav_wtv.mid"
        },
        "708": {
            "title": "Under the Stars",
            "url": "wtv-music:/music/newmusic/keyboards/undr_wtv.mid"
        },
        "709": {
            "title": "Wind",
            "url": "wtv-music:/music/newmusic/pop2/wind1.mid"
        },
        "800": {
            "title": "Dark Dance",
            "url": "wtv-music:/music/techno/darkdance/dark_dance.mid"
        },
        "801": {
            "title": "Future Sound",
            "url": "wtv-music:/music/techno/futuresound/future_sound.mid"
        },
        "802": {
            "title": "House Jam",
            "url": "wtv-music:/music/techno/housejam/house_jam.mid"
        },
        "803": {
            "title": "Nightclub",
            "url": "wtv-music:/music/techno/nightclub/nightclub.mid"
        },
        "804": {
            "title": "Tekworld",
            "url": "wtv-music:/music/techno/tekworld/tekworld.mid"
        },
        "900": {
            "title": "Bogged Down",
            "url": "wtv-music:/music/newmusic/techno/BoggedDown.mid"
        },
        "901": {
            "title": "Dancing",
            "url": "wtv-music:/music/newmusic/techno/Dancing.mid"
        },
        "902": {
            "title": "Dark Game",
            "url": "wtv-music:/music/newmusic/techno/DarkGame.mid"
        },
        "903": {
            "title": "Fever",
            "url": "wtv-music:/music/newmusic/techno/Fever.mid"
        },
        "904": {
            "title": "Harry Rock",
            "url": "wtv-music:/music/newmusic/techno/HarryRock.mid"
        },
        "905": {
            "title": "I Am Busy",
            "url": "wtv-music:/music/newmusic/techno/IAmBusy.mid"
        },
        "906": {
            "title": "7 in the Morning",
            "url": "wtv-music:/music/newmusic/techno/7InTheMorning.mid"
        },
        "907": {
            "title": "Rain",
            "url": "wtv-music:/music/newmusic/techno/Rain.mid"
        },
        "908": {
            "title": "Rollin'",
            "url": "wtv-music:/music/newmusic/techno/Rollin.mid"
        },
        "909": {
            "title": "Running",
            "url": "wtv-music:/music/newmusic/techno/Running.mid"
        },
        "910": {
            "title": "The Dance",
            "url": "wtv-music:/music/newmusic/techno/TheDance.mid"
        },
        "911": {
            "title": "Presentation",
            "url": "wtv-music:/music/newmusic/techno/Presentation.mid"
        },
        "1000": {
            "title": "The Entertainer",
            "url": "wtv-music:/music/classicl/ragtime/joplin_entertainer.mid"
        },
        "1001": {
            "title": "Fig Leaf Rag",
            "url": "wtv-music:/music/classicl/ragtime/joplin_figleafrag.mid"
        },
        "1002": {
            "title": "Maple Leaf Rag",
            "url": "wtv-music:/music/classicl/ragtime/joplin_mapleleafrag.mid"
        },
        "1003": {
            "title": "Wall Street Rag",
            "url": "wtv-music:/music/classicl/ragtime/joplin_wallstreetrag.mid"
        },
        "1004": {
            "title": "Baltimore Todolo",
            "url": "wtv-music:/music/classicl/ragtime/eubieblake_baltimoretodolo.mid"
        },
        "1005": {
            "title": "Mister Joe",
            "url": "wtv-music:/music/classicl/ragtime/jelly_mrjoe.mid"
        },
        "1006": {
            "title": "Kansas City Stomp",
            "url": "wtv-music:/music/classicl/ragtime/jelly_kansascitystomp.mid"
        },
        "1100": {
            "title": "Brasilia",
            "url": "wtv-music:/music/newmusic/world/brasilia.mid"
        },
        "1101": {
            "title": "Dream Girl",
            "url": "wtv-music:/music/newmusic/world/grldream.mid"
        },
        "1102": {
            "title": "Herbie",
            "url": "wtv-music:/music/newmusic/world/herbie.mid"
        },
        "1103": {
            "title": "Jive Coffee",
            "url": "wtv-music:/music/newmusic/world/jivecofe.mid"
        },
        "1104": {
            "title": "Moorea",
            "url": "wtv-music:/music/newmusic/world/moorea.mid"
        },
        "1105": {
            "title": "PCH",
            "url": "wtv-music:/music/newmusic/world/pch.mid"
        },
        "1106": {
            "title": "Prussian",
            "url": "wtv-music:/music/newmusic/world/prussian.mid"
        },
        "1107": {
            "title": "Road Untraveled",
            "url": "wtv-music:/music/newmusic/world/roadtrav.mid"
        },
        "1108": {
            "title": "Xess",
            "url": "wtv-music:/music/newmusic/pop2/xess.mid"
        },
        "1500": {
            "title": "Stickerbrush Symphony",
            "url": "wtv-music:/music/vidgame/bramble.mid"
        },
        "1501": {
            "title": "Dearly Beloved",
            "url": "wtv-music:/music/vidgame/DearlyBeloved.mid"
        },
        "1502": {
            "title": "Night of Fate",
            "url": "wtv-music:/music/vidgame/NightofFate.mid"
        },
        "1503": {
            "title": "SimCity SNES",
            "url": "wtv-music:/music/vidgame/city.mid"
        },
        "1504": {
            "title": "Mt. Gagazat",
            "url": "wtv-music:/music/vidgame/Gagazat_Mt.mid"
        },
        "1505": {
            "title": "Terranigma Remix",
            "url": "wtv-music:/music/vidgame/Terranigma_Remix.mid"
        },
        "1506": {
            "title": "Lufia World Map",
            "url": "wtv-music:/music/vidgame/luf1map.mid"
        },
        "1507": {
            "title": "Lufia Doom Fortress",
            "url": "wtv-music:/music/vidgame/luf1fortress.mid"
        },
        "1508": {
            "title": "Zelda Underworld Remix",
            "url": "wtv-music:/music/vidgame/Zelda_I_-_Underworld_Theme.mid"
        },
        "1509": {
            "title": "Tetris Theme",
            "url": "wtv-music:/music/vidgame/tetris.mid"
        },
        "1510": {
            "title": "Sonic 3 Competition",
            "url": "wtv-music:/music/vidgame/competit.mid"
        },
        "1511": {
            "title": "Balamb Garden",
            "url": "wtv-music:/music/vidgame/Whatever_FF8_Balamb_GARDEN.mid"
        },
        "1512": {
            "title": "SeeD",
            "url": "wtv-music:/music/vidgame/Whatever_FF8_SeeD.mid"
        },
        "1513": {
            "title": "Oil Drum Alley",
            "url": "wtv-music:/music/vidgame/dkc.mid"
        },
        "1514": {
            "title": "The King of Speed",
            "url": "wtv-music:/music/vidgame/Daytona_USA_-_The_King_of_Speed.mid"
        },
        "1515": {
            "title": "Let's Go Away",
            "url": "wtv-music:/music/vidgame/Lets_Go_Away-Intermediate_Track.mid"
        },
        "1600": {
            "title": "I Love You Always Forever",
            "url": "wtv-music:/music/zefie/I_Love_You_Always_Forever.mid"
        },
        "1601": {
            "title": "Only Happy When it Rains",
            "url": "wtv-music:/music/zefie/only_happy_when_it_rains.mid"
        },
        "1602": {
            "title": "Halloween",
            "url": "wtv-music:/music/zefie/Halloween.mid"
        },
        "1603": {
            "title": "Cool",
            "url": "wtv-music:/music/zefie/cool.mid"
        },
        "1604": {
            "title": "Black Celebration",
            "url": "wtv-music:/music/zefie/gothmusic1.mid"
        },
        "1605": {
            "title": "Save Yourself",
            "url": "wtv-music:/music/zefie/StabbingWestward_SaveYourself.mid"
        },
        "1606": {
            "title": "Oh Starry Night",
            "url": "wtv-music:/music/zefie/starnite.mid"
        },
        "1607": {
            "title": "Blue Monday",
            "url": "wtv-music:/music/zefie/bluemonday.mid"
        },
        "1608": {
            "title": "Another Day in Paradise",
            "url": "wtv-music:/music/zefie/anotherdayinparadise.mid"
        },
        "1609": {
            "title": "Goin' Down the Fast Way",
            "url": "wtv-music:/music/zefie/new.mid"
        },
        "1610": {
            "title": "Take On Me",
            "url": "wtv-music:/music/zefie/takeonme.mid"
        },
        "1611": {
            "title": "Better Off Alone",
            "url": "wtv-music:/music/zefie/betteroffalone.mid"
        },
        "1612": {
            "title": "Runaway Train",
            "url": "wtv-music:/music/zefie/RunawayTrain.mid"
        },
        "1613": {
            "title": "Shout",
            "url": "wtv-music:/music/zefie/shout.mid"
        },
        "1614": {
            "title": "Scatman",
            "url": "wtv-music:/music/zefie/scatman.mid"
        },
        "1615": {
            "title": "Please Don't Go",
            "url": "wtv-music:/music/zefie/PleaseDontGo.mid"
        }
    };
    musiclist_rmf = {
        "100": {
            "title": "Mystical",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/mystical.rmf"
        },
        "101": {
            "title": "Quietude",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/quietude.rmf"
        },
        "102": {
            "title": "Sun Lane",
            "url": "wtv-music:/MusicCache/headspace/RMF/mellow/sunlane.rmf"
        },
        "103": {
            "title": "Windows Everywhere",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/windows-everywhere.rmf"
        },
        "104": {
            "title": "Byzantium",
            "url": "wtv-music:/MusicCache/headspace/RMF/ambient/byzantium.rmf"
        },
        "105": {
            "title": "Cave",
            "url": "wtv-music:/MusicCache/headspace/RMF/ambient/cave.rmf"
        },
        "106": {
            "title": "Cozy",
            "url": "wtv-music:/MusicCache/headspace/RMF/ambient/cozy.rmf"
        },
        "107": {
            "title": "Overmind",
            "url": "wtv-music:/MusicCache/headspace/RMF/ambient/overmind.rmf"
        },
        "108": {
            "title": "Personal Twilight",
            "url": "wtv-music:/MusicCache/headspace/RMF/ambient/personal-twilight.rmf"
        },
        "109": {
            "title": "Precipice",
            "url": "wtv-music:/MusicCache/headspace/RMF/ambient/precipice.rmf"
        },
        "200": {
            "title": "Badinerie",
            "url": "wtv-music:/MusicCache/headspace/RMF/mellow/badinerie.rmf"
        },
        "201": {
            "title": "Brahms",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/brahms-rhapsody.rmf"
        },
        "202": {
            "title": "Chopin Ballade 1",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/chopin-ballade-1.rmf"
        },
        "203": {
            "title": "Chopin Ballade 2",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/chopin-ballade-2.rmf"
        },
        "204": {
            "title": "Chopin Nocturne",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/chopin-nocturne.rmf"
        },
        "205": {
            "title": "Moonlight sonata",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/moonlight_sonata.rmf"
        },
        "206": {
            "title": "Mendelssohn prelude",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/mendelssohn-prelude.rmf"
        },
        "207": {
            "title": "Mouret Rondeau",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/mouret-rondeau.rmf"
        },
        "208": {
            "title": "Mozart Sym. 40",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/mozart-symphony40.rmf"
        },
        "209": {
            "title": "Flight Bumblebee",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/flight_of_the_bumblebee.rmf"
        },
        "210": {
            "title": "Purcell Voluntary",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/purcell-voluntary.rmf"
        },
        "211": {
            "title": "La Barriere",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/la-barriera.rmf"
        },
        "212": {
            "title": "Smetana Moldau",
            "url": "wtv-music:/MusicCache/headspace/RMF/classical/smetana-moldau.rmf"
        },
        "300": {
            "title": "C-major prelude",
            "url": "wtv-music:/music/classicl/bach/bach_cmaj_prelude.mid"
        },
        "301": {
            "title": "C-major fugue",
            "url": "wtv-music:/music/classicl/bach/bach_fugue_cmajor.mid"
        },
        "302": {
            "title": "C-minor fugue",
            "url": "wtv-music:/music/classicl/bach/bach_fugue_cminor.mid"
        },
        "303": {
            "title": "Eb-major fugue",
            "url": "wtv-music:/music/classicl/bach/bach_fugue_eflatMajor.mid"
        },
        "304": {
            "title": "D-minor invention",
            "url": "wtv-music:/music/classicl/bach/bach_dminor_2part_invention.mid"
        },
        "305": {
            "title": "Little fugue",
            "url": "wtv-music:/music/classicl/bach/bach_little_fugue.mid"
        },
        "306": {
            "title": "Minuet in G",
            "url": "wtv-music:/music/classicl/bach/bach_menuet_in_G.mid"
        },
        "307": {
            "title": "Violin partita in E",
            "url": "wtv-music:/music/classicl/bach/bach_violin_partita_in_e.mid"
        },
        "400": {
            "title": "Low Jinx",
            "url": "wtv-music:/music/swingey-jazzy/lowjinx.mid"
        },
        "401": {
            "title": "Papa's Old Shop",
            "url": "wtv-music:/music/swingey-jazzy/oldshop.mid"
        },
        "402": {
            "title": "Acey",
            "url": "wtv-music:/music/funky/acey/acey.mid"
        },
        "403": {
            "title": "Funky",
            "url": "wtv-music:/music/funky/funkyass/funky.mid"
        },
        "404": {
            "title": "Groovy",
            "url": "wtv-music:/music/funky/groovy/groovy.mid"
        },
        "405": {
            "title": "Groove Deux",
            "url": "wtv-music:/MusicCache/headspace/RMF/upbeat/groovedeux.rmf"
        },
        "406": {
            "title": "Synchotronic",
            "url": "wtv-music:/MusicCache/headspace/RMF/upbeat/synchotronic.rmf"
        },
        "407": {
            "title": "Chillin",
            "url": "wtv-music:/MusicCache/headspace/RMF/mellow/chillin.rmf"
        },
        "408": {
            "title": "Popster",
            "url": "wtv-music:/MusicCache/headspace/RMF/upbeat/popster.rmf"
        },
        "500": {
            "title": "Chill Jingle",
            "url": "wtv-music:/music/pop/chilljngl/chill_jingle.mid"
        },
        "501": {
            "title": "Cool Shades",
            "url": "wtv-music:/music/newmusic/pop2/CoolShad.mid"
        },
        "502": {
            "title": "Flute Boy",
            "url": "wtv-music:/music/newmusic/pop2/flutey.mid"
        },
        "503": {
            "title": "Georgy",
            "url": "wtv-music:/music/newmusic/pop2/georgy.mid"
        },
        "504": {
            "title": "Glasses",
            "url": "wtv-music:/music/newmusic/pop2/Glasses.mid"
        },
        "505": {
            "title": "House",
            "url": "wtv-music:/music/pop/house/house.mid"
        },
        "506": {
            "title": "Jazzin'",
            "url": "wtv-music:/music/newmusic/pop2/Jazzin.mid"
        },
        "507": {
            "title": "Jazzscape",
            "url": "wtv-music:/music/newmusic/pop2/jscape.mid"
        },
        "508": {
            "title": "Popster",
            "url": "wtv-music:/MusicCache/headspace/RMF/upbeat/popster.rmf"
        },
        "509": {
            "title": "Relief",
            "url": "wtv-music:/music/pop/relief/relief.mid"
        },
        "510": {
            "title": "Royal",
            "url": "wtv-music:/music/pop/royal/royal.mid"
        },
        "511": {
            "title": "So Grand",
            "url": "wtv-music:/music/newmusic/pop2/sogrand.mid"
        },
        "512": {
            "title": "Tasty Wave",
            "url": "wtv-music:/music/newmusic/pop2/tastywav.mid"
        },
        "600": {
            "title": "Come On In",
            "url": "wtv-music:/music/newmusic/jazz/ComeOnInn.mid"
        },
        "601": {
            "title": "Downtown",
            "url": "wtv-music:/music/newmusic/jazz/Downtown.mid"
        },
        "602": {
            "title": "Huffin Puffin",
            "url": "wtv-music:/music/newmusic/jazz/HuffinPuffin.mid"
        },
        "603": {
            "title": "I Can't Wait",
            "url": "wtv-music:/music/newmusic/jazz/ICantWait.mid"
        },
        "604": {
            "title": "Liz and Larry",
            "url": "wtv-music:/music/newmusic/jazz/Liz-N-Larry.mid"
        },
        "605": {
            "title": "Missin' Summer",
            "url": "wtv-music:/music/newmusic/jazz/MissinSummer.mid"
        },
        "606": {
            "title": "Oh, I'm On Fire",
            "url": "wtv-music:/music/newmusic/jazz/OhImOnFire.mid"
        },
        "607": {
            "title": "Park It Here",
            "url": "wtv-music:/music/newmusic/jazz/ParkItHere.mid"
        },
        "608": {
            "title": "Slow Day",
            "url": "wtv-music:/music/newmusic/jazz/SlowDay.mid"
        },
        "609": {
            "title": "Swing Set",
            "url": "wtv-music:/music/newmusic/jazz/SwingSet.mid"
        },
        "610": {
            "title": "Let's Play Ball",
            "url": "wtv-music:/music/newmusic/jazz/LetsPlayBall.mid"
        },
        "611": {
            "title": "Mr. Chop Chop",
            "url": "wtv-music:/music/newmusic/jazz/MrChopChop.mid"
        },
        "700": {
            "title": "Catacombs",
            "url": "wtv-music:/music/newmusic/keyboards/cata_wtv.mid"
        },
        "701": {
            "title": "At Home",
            "url": "wtv-music:/music/newmusic/keyboards/home_wtv.mid"
        },
        "702": {
            "title": "Just",
            "url": "wtv-music:/music/newmusic/keyboards/just_wtv.mid"
        },
        "703": {
            "title": "Good 'Nite",
            "url": "wtv-music:/music/newmusic/keyboards/nite_wtv.mid"
        },
        "704": {
            "title": "Piano Jazz 1",
            "url": "wtv-music:/music/newmusic/pop2/pnojazz1.mid"
        },
        "705": {
            "title": "Piano Jazz 2",
            "url": "wtv-music:/music/newmusic/pop2/pnojazz2.mid"
        },
        "706": {
            "title": "Shredded Paper",
            "url": "wtv-music:/music/newmusic/keyboards/shre_wtv.mid"
        },
        "707": {
            "title": "Travelin'",
            "url": "wtv-music:/MusicCache/headspace/RMF/ambient/travelling.rmf"
        },
        "708": {
            "title": "Under the Stars",
            "url": "wtv-music:/music/newmusic/keyboards/undr_wtv.mid"
        },
        "709": {
            "title": "Wind",
            "url": "wtv-music:/music/newmusic/pop2/wind1.mid"
        },
        "710": {
            "title": "Anticipation",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/anticipation.rmf"
        },
        "711": {
            "title": "Busybody",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/busybody.rmf"
        },
        "712": {
            "title": "Grandeur",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/grandeur.rmf"
        },
        "713": {
            "title": "Reminisce",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/reminisce.rmf"
        },
        "800": {
            "title": "Dark Dance",
            "url": "wtv-music:/music/techno/darkdance/dark_dance.mid"
        },
        "801": {
            "title": "Future Sound",
            "url": "wtv-music:/music/techno/futuresound/future_sound.mid"
        },
        "802": {
            "title": "House Jam",
            "url": "wtv-music:/music/techno/housejam/house_jam.mid"
        },
        "803": {
            "title": "Nightclub",
            "url": "wtv-music:/music/techno/nightclub/nightclub.mid"
        },
        "804": {
            "title": "Tekworld",
            "url": "wtv-music:/music/techno/tekworld/tekworld.mid"
        },
        "805": {
            "title": "Hardtek",
            "url": "wtv-music:/MusicCache/headspace/RMF/upbeat/hardtek.rmf"
        },
        "806": {
            "title": "Schizo Trance",
            "url": "wtv-music:/MusicCache/headspace/RMF/upbeat/schizo-trance.rmf"
        },
        "807": {
            "title": "Krafty Techy",
            "url": "wtv-music:/MusicCache/headspace/RMF/upbeat/kraftytechy.rmf"
        },
        "900": {
            "title": "Bogged Down",
            "url": "wtv-music:/music/newmusic/techno/BoggedDown.mid"
        },
        "901": {
            "title": "Dancing",
            "url": "wtv-music:/music/newmusic/techno/Dancing.mid"
        },
        "902": {
            "title": "Dark Game",
            "url": "wtv-music:/music/newmusic/techno/DarkGame.mid"
        },
        "903": {
            "title": "Fever",
            "url": "wtv-music:/music/newmusic/techno/Fever.mid"
        },
        "904": {
            "title": "Harry Rock",
            "url": "wtv-music:/music/newmusic/techno/HarryRock.mid"
        },
        "905": {
            "title": "I Am Busy",
            "url": "wtv-music:/music/newmusic/techno/IAmBusy.mid"
        },
        "906": {
            "title": "7 in the Morning",
            "url": "wtv-music:/music/newmusic/techno/7InTheMorning.mid"
        },
        "907": {
            "title": "Rain",
            "url": "wtv-music:/music/newmusic/techno/Rain.mid"
        },
        "908": {
            "title": "Rollin'",
            "url": "wtv-music:/music/newmusic/techno/Rollin.mid"
        },
        "909": {
            "title": "Running",
            "url": "wtv-music:/music/newmusic/techno/Running.mid"
        },
        "910": {
            "title": "The Dance",
            "url": "wtv-music:/music/newmusic/techno/TheDance.mid"
        },
        "911": {
            "title": "Presentation",
            "url": "wtv-music:/music/newmusic/techno/Presentation.mid"
        },
        "1000": {
            "title": "The Entertainer",
            "url": "wtv-music:/music/classicl/ragtime/joplin_entertainer.mid"
        },
        "1001": {
            "title": "Fig Leaf Rag",
            "url": "wtv-music:/music/classicl/ragtime/joplin_figleafrag.mid"
        },
        "1002": {
            "title": "Maple Leaf Rag",
            "url": "wtv-music:/music/classicl/ragtime/joplin_mapleleafrag.mid"
        },
        "1003": {
            "title": "Wall Street Rag",
            "url": "wtv-music:/music/classicl/ragtime/joplin_wallstreetrag.mid"
        },
        "1004": {
            "title": "Baltimore Todolo",
            "url": "wtv-music:/music/classicl/ragtime/eubieblake_baltimoretodolo.mid"
        },
        "1005": {
            "title": "Mister Joe",
            "url": "wtv-music:/music/classicl/ragtime/jelly_mrjoe.mid"
        },
        "1006": {
            "title": "Kansas City Stomp",
            "url": "wtv-music:/music/classicl/ragtime/jelly_kansascitystomp.mid"
        },
        "1100": {
            "title": "Brasilia",
            "url": "wtv-music:/music/newmusic/world/brasilia.mid"
        },
        "1101": {
            "title": "Dream Girl",
            "url": "wtv-music:/music/newmusic/world/grldream.mid"
        },
        "1102": {
            "title": "Herbie",
            "url": "wtv-music:/music/newmusic/world/herbie.mid"
        },
        "1103": {
            "title": "Jive Coffee",
            "url": "wtv-music:/music/newmusic/world/jivecofe.mid"
        },
        "1104": {
            "title": "Moorea",
            "url": "wtv-music:/music/newmusic/world/moorea.mid"
        },
        "1105": {
            "title": "PCH",
            "url": "wtv-music:/music/newmusic/world/pch.mid"
        },
        "1106": {
            "title": "Prussian",
            "url": "wtv-music:/music/newmusic/world/prussian.mid"
        },
        "1107": {
            "title": "Road Untraveled",
            "url": "wtv-music:/music/newmusic/world/roadtrav.mid"
        },
        "1108": {
            "title": "Xess",
            "url": "wtv-music:/music/newmusic/pop2/xess.mid"
        },
        "1200": {
            "title": "Happy Go Lucky",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/happy-go-lucky.rmf"
        },
        "1201": {
            "title": "Loungy Sixties",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/loungy-sixties.rmf"
        },
        "1202": {
            "title": "Tropicalist",
            "url": "wtv-music:/MusicCache/headspace/RMF/upbeat/tropicalist-full.rmf"
        },
        "1203": {
            "title": "Jet Set",
            "url": "wtv-music:/MusicCache/headspace/RMF/upbeat/jetset.rmf"
        },
        "1204": {
            "title": "Renegado",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/renegado.rmf"
        },
        "1300": {
            "title": "Affectionate",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/affectionate.rmf"
        },
        "1301": {
            "title": "Contemplate",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/contemplate.rmf"
        },
        "1302": {
            "title": "Sociable",
            "url": "wtv-music:/MusicCache/headspace/RMF/moods/sociable.rmf"
        },
        "1303": {
            "title": "Aqua Sky",
            "url": "wtv-music:/MusicCache/headspace/RMF/mellow/aqua-sky.rmf"
        },
        "1304": {
            "title": "Celestial",
            "url": "wtv-music:/MusicCache/headspace/RMF/mellow/celestial.rmf"
        },
        "1305": {
            "title": "Garden of Time",
            "url": "wtv-music:/MusicCache/headspace/RMF/mellow/garden-of-time.rmf"
        },
        "1306": {
            "title": "Pastorale",
            "url": "wtv-music:/MusicCache/headspace/RMF/mellow/pastorale.rmf"
        },
        "1307": {
            "title": "Smooth Groove",
            "url": "wtv-music:/MusicCache/headspace/RMF/mellow/smoothgroov-full.rmf"
        },
        "1400": {
            "title": "Blue Light",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/bleulight.rmf"
        },
        "1401": {
            "title": "Blue Fog",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/blue-fog.rmf"
        },
        "1402": {
            "title": "Bugbreaker",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/bugbreaker.rmf"
        },
        "1403": {
            "title": "Chop Squad",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/chop-squad.rmf"
        },
        "1404": {
            "title": "Frenetian",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/frenitian.rmf"
        },
        "1405": {
            "title": "Irradiator",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/irradiator.rmf"
        },
        "1406": {
            "title": "Obliqua",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/obliquia.rmf"
        },
        "1407": {
            "title": "Polyzoot",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/polyzoot.rmf"
        },
        "1408": {
            "title": "Seethroo",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/seethroo.rmf"
        },
        "1409": {
            "title": "Tripwire",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/tripwire.rmf"
        },
        "1410": {
            "title": "Vampster",
            "url": "wtv-music:/MusicCache/headspace/RMF/underground/vampster.rmf"
        },
        "1411": {
            "title": "Shibuya-ku",
            "url": "wtv-music:/MusicCache/headspace/RMF/ambient/shibuya-ku.rmf"
        },
        "1500": {
            "title": "Stickerbrush Symphony",
            "url": "wtv-music:/music/vidgame/bramble.mid"
        },
        "1501": {
            "title": "Dearly Beloved",
            "url": "wtv-music:/music/vidgame/DearlyBeloved.mid"
        },
        "1502": {
            "title": "Night of Fate",
            "url": "wtv-music:/music/vidgame/NightofFate.mid"
        },
        "1503": {
            "title": "SimCity SNES",
            "url": "wtv-music:/music/vidgame/city.mid"
        },
        "1504": {
            "title": "Mt. Gagazat",
            "url": "wtv-music:/music/vidgame/Gagazat_Mt.mid"
        },
        "1505": {
            "title": "Terranigma Remix",
            "url": "wtv-music:/music/vidgame/Terranigma_Remix.mid"
        },
        "1506": {
            "title": "Lufia World Map",
            "url": "wtv-music:/music/vidgame/luf1map.mid"
        },
        "1507": {
            "title": "Lufia Doom Fortress",
            "url": "wtv-music:/music/vidgame/luf1fortress.mid"
        },
        "1508": {
            "title": "Zelda Underworld Remix",
            "url": "wtv-music:/music/vidgame/Zelda_I_-_Underworld_Theme.mid"
        },
        "1509": {
            "title": "Tetris Theme",
            "url": "wtv-music:/music/vidgame/tetris.mid"
        },
        "1510": {
            "title": "Sonic 3 Competition",
            "url": "wtv-music:/music/vidgame/competit.mid"
        },
        "1511": {
            "title": "Balamb Garden",
            "url": "wtv-music:/music/vidgame/Whatever_FF8_Balamb_GARDEN.mid"
        },
        "1512": {
            "title": "SeeD",
            "url": "wtv-music:/music/vidgame/Whatever_FF8_SeeD.mid"
        },
        "1513": {
            "title": "Oil Drum Alley",
            "url": "wtv-music:/music/vidgame/dkc.mid"
        },
        "1514": {
            "title": "The King of Speed",
            "url": "wtv-music:/music/vidgame/Daytona_USA_-_The_King_of_Speed.mid"
        },
        "1515": {
            "title": "Let's Go Away",
            "url": "wtv-music:/music/vidgame/Lets_Go_Away-Intermediate_Track.mid"
        },
        "1600": {
            "title": "I Love You Always Forever",
            "url": "wtv-music:/music/zefie/I_Love_You_Always_Forever.mid"
        },
        "1601": {
            "title": "Only Happy When it Rains",
            "url": "wtv-music:/music/zefie/only_happy_when_it_rains.mid"
        },
        "1602": {
            "title": "Halloween",
            "url": "wtv-music:/music/zefie/Halloween.mid"
        },
        "1603": {
            "title": "Cool",
            "url": "wtv-music:/music/zefie/cool.mid"
        },
        "1604": {
            "title": "Black Celebration",
            "url": "wtv-music:/music/zefie/gothmusic1.mid"
        },
        "1605": {
            "title": "Save Yourself",
            "url": "wtv-music:/music/zefie/StabbingWestward_SaveYourself.mid"
        },
        "1606": {
            "title": "Oh Starry Night",
            "url": "wtv-music:/music/zefie/starnite.mid"
        },
        "1607": {
            "title": "Blue Monday",
            "url": "wtv-music:/music/zefie/bluemonday.mid"
        },
        "1608": {
            "title": "Another Day in Paradise",
            "url": "wtv-music:/music/zefie/anotherdayinparadise.mid"
        },
        "1609": {
            "title": "Goin' Down the Fast Way",
            "url": "wtv-music:/music/zefie/new.mid"
        },
        "1610": {
            "title": "Take On Me",
            "url": "wtv-music:/music/zefie/takeonme.mid"
        },
        "1611": {
            "title": "Better Off Alone",
            "url": "wtv-music:/music/zefie/betteroffalone.mid"
        },
        "1612": {
            "title": "Runaway Train",
            "url": "wtv-music:/music/zefie/RunawayTrain.mid"
        },
        "1613": {
            "title": "Shout",
            "url": "wtv-music:/music/zefie/shout.mid"
        },
        "1614": {
            "title": "Scatman",
            "url": "wtv-music:/music/zefie/scatman.mid"
        },
        "1615": {
            "title": "Weird",
            "url": "wtv-music:/music/zefie/weird.mid"
        }
    };

    constructor(minisrv_config, session_data) {
        if (!minisrv_config) throw ("minisrv_config required");
        if (!session_data) throw ("WTVClientSessionData required");
        const WTVShared = require("./WTVShared.js")['WTVShared'];
        this.minisrv_config = minisrv_config;
        this.session_data = session_data;
        this.wtvshared = new WTVShared(minisrv_config);
    }

    getMusicObj(force_default = false) {
        let music_obj = this.session_data.getSessionData("wtv-bgmusic");
        if (music_obj === null) music_obj = {};

        // check if we need to set defaults
        let setDefaults = force_default;
        if (!music_obj.enableCategories) setDefaults = true;
        else if (music_obj.enableCategories.length == 0) setDefaults = true;
        if (!music_obj.enableSongs) setDefaults = true;
        else if (music_obj.enableSongs.length == 0) setDefaults = true;

        if (setDefaults === true) {
            // set up defaults
            if (this.session_data.hasCap("client-can-do-rmf")) {
                // rmf
                music_obj.enableCategories = ["1", "2", "3", "7", "12", "13", "15", "16"];
                music_obj.enableSongs = [
                    "100", "101", "102", "104", "107", "109",
                    "205", "206", "207", "211",
                    "300", "301", "306", "307", "308",
                    "400", "401", "402", "407", "408",
                    "500", "501", "502", "503", "504",
                    "600", "601", "602", "603", "604",
                    "700", "701", "702", "703", "712",
                    "800", "801", "805", "806", "807",
                    "900", "901", "902", "903", "904",
                    "1000", "1002", "1004", "1005", "1006",
                    "1100", "1101", "1102", "1103", "1104",
                    "1201", "1202", "1203", "1204",
                    "1300", "1302",
                    "1400", "1401",
                    "1500", "1503", "1505", "1507", "1511", "1513", "1514",
                    "1600", "1603", "1607", "1609", "1612", "1614"
                ];
            } else {
                // classic
                music_obj.enableCategories = ["1", "2", "8", "15", "16"];
                music_obj.enableSongs = [
                    "100", "101", "102", "104",
                    "200", "205", "207", "209", "211",
                    "300", "301", "306", "307", "308",
                    "400", "401", "402", "403", "404",
                    "500", "501", "502", "503", "504",
                    "600", "601", "602", "603", "604",
                    "700", "701", "702", "703", "704",
                    "800", "801", "802", "803", "804",
                    "900", "901", "902", "903", "904",
                    "1000", "1002", "1004", "1005", "1006",
                    "1100", "1101", "1102", "1103", "1104",
                    "1500", "1503", "1505", "1507", "1511", "1513", "1514",
                    "1600", "1603", "1607", "1609", "1612", "1614"
                ];
            }
            this.session_data.setSessionData("wtv-bgmusic", music_obj);
            this.session_data.saveSessionData();
        }
        return music_obj;
    }


    isInMusicList(songid) {
        return (this.getSong(songid) !== null) ? true : false;
    }

    getSong(songid) {
        let musiclist;
        if (this.session_data.hasCap("client-can-do-rmf")) {
            // use rmf list
            musiclist = this.musiclist_rmf;
        } else {
            // use classic list
            musiclist = this.musiclist_classic;
        }
        if (musiclist[songid]) return musiclist[songid];
        return null;
    }

    getSongCategory(songid) {
        if (String(songid).length === 3) {
            // 3 digit song id
            return parseInt(String(songid).slice(0, 1));
        } else if (String(songid).length === 4) {
            // 4 digit song id
            return parseInt(String(songid).slice(0, 2));
        }
        return null;
    }


    getCategorySongList(category) {
        let musiclist;
        if (this.session_data.hasCap("client-can-do-rmf")) {
            // use rmf list
            musiclist = this.musiclist_rmf;
        } else {
            // use classic list
            musiclist = this.musiclist_classic;
        }
        const songList = [];
        Object.keys(musiclist).forEach(function (k) {
            musiclist[k].id = k;
            if (String(category).length === 1) {
                // 3 digit song id
                if (parseInt(k.slice(0, 1)) == parseInt(category) && String(k).length === 3) songList.push(musiclist[k]);
            } else if (String(category).length === 2) {
                // 4 digit song id
                if (parseInt(k.slice(0, 2)) == parseInt(category) && String(k).length === 4) songList.push(musiclist[k]);
            }
        });
        return songList.filter(value => Object.keys(value).length !== 0);
    }

    getCategoryList() {
        const enabledCategories = [];
        const self = this;
        Object.keys(self.categories).forEach(function (k) {
            const songList = self.getCategorySongList(parseInt(k) + 1);
            if (songList.length > 0) enabledCategories.push({
                "id": parseInt(k) + 1, "name": self.categories[k]
            });
        });
        return enabledCategories.filter(value => Object.keys(value.name).length !== 0);
    }


    getCategoryName(category) {
        return this.categories[parseInt(category) - 1];
    }

    isCategoryEnabled(category) {
        const music_obj = this.getMusicObj();
        let enabled = false;
        music_obj.enableCategories.forEach(function (v) {
            if (parseInt(v) == parseInt(category)) {
                enabled = true;
            }
        });
        return enabled;
    }

    isSongEnabled(song, checkCat = false) {
        const music_obj = this.getMusicObj();
        let enabled = false;
        music_obj.enableSongs.forEach(function (v) {
            if (parseInt(v) == parseInt(song)) {
                if (checkCat) {
                    const songCategory = this.getSongCategory(song);
                    if (this.isCategoryEnabled(songCategory)) {
                        enabled = true;
                    }
                } else {
                    enabled = true;
                }
            }
        });
        return enabled;
    }
}

module.exports = WTVBGMusic;