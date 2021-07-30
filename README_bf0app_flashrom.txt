The bf0app flashing system requires a two things that you must be aware of, that are different from a typical setup:
1) Your PPP system MUST accept auth, a noauth setup will not work for the 2nd dialing phase
2) You must have a clean dialup. DreamPi voltage-hacked lines, and unstable VoIP systems are known
   to cause errors, leaving the box in a 'braindead' state with no flash. MiniSrv can help recover
   from this but you will need to provide a stable dialup connection. This was tested with my Cisco 3825 setup.