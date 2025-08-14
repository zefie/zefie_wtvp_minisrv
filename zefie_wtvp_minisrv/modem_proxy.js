// Rockwell to USRobotics Modem Proxy for MAME Bitbanger
const net = require('net');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// Configuration
const TCP_IP = '127.0.0.1';
const TCP_PORT = 57388;
const SERIAL_PORT = 'COM3';
const SERIAL_BAUDRATE = 115200;

let NEXT_RECV_IS_LAST_ASCII = false;
let DATA_MODE = false;

const THINGS_TO_STRIP = ["S95=36", "&Q5", "S51=31", "S220=0", "&Q5", "&K3", "&D2"];
const THINGS_TO_REPLACE = [
    ["M0", "M1"],           // M1 = Speaker on
    ["S11=110", "S11=50"],   // S11 = Dial speed
    ["S11=200", "S11=50"],   // S11 = Dial speed
    ["18004653537", "5736666"],
    ["18006138199", "5736666"]
];

// Global variables
let serialPort = null;
let server = null;
let currentClient = null;

// Initialize serial port
function initSerial() {
    return new Promise((resolve, reject) => {
        try {
            serialPort = new SerialPort({
                path: SERIAL_PORT,
                baudRate: SERIAL_BAUDRATE,
                autoOpen: false,
                // Disable buffering for immediate data flow
                highWaterMark: 1,
                // Set minimal timeouts
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                rtscts: false,
                xon: false,
                xoff: false,
                xany: false
            });

            serialPort.open((err) => {
                if (err) {
                    console.error('Error opening serial port:', err.message);
                    reject(err);
                    return;
                }
                console.log(`Serial port ${SERIAL_PORT} opened at ${SERIAL_BAUDRATE} baud`);
                
                // Disable any internal buffering
                serialPort.set({
                    brk: false,
                    cts: false,
                    dtr: true,
                    rts: true
                });
                
                // Add a small delay to ensure port is ready
                setTimeout(() => {
                    resolve(serialPort);
                }, 100);
            });

        } catch (error) {
            console.error('Error initializing serial port:', error);
            reject(error);
        }
    });
}

// Reset modem to command mode and hang up
function resetModemToCommandMode() {
    try {
        // Send escape sequence to exit data mode
        serialPort.write(Buffer.from('+++', 'ascii'));
        setTimeout(() => {
            // Send hang up command
            serialPort.write(Buffer.from('ATH\r', 'ascii'));
            console.log("Sent modem reset commands: +++ and ATH");
        }, 500);
    } catch (error) {
        console.error('Error resetting modem:', error);
    }
}

// Handle data from socket to serial
function handleSocketToSerial(socket) {
    let buffer = Buffer.alloc(0);

    socket.on('data', (data) => {
        if (!DATA_MODE) {
            buffer = Buffer.concat([buffer, data]);
            
            // Process commands only after receiving a complete command ending in '\r'
            // Use Buffer.indexOf to find CR byte (0x0D) for binary safety
            const crIndex = buffer.indexOf(0x0D); // '\r' = 0x0D
            
            if (crIndex === -1) {
                return; // Wait for complete command
            }
            
            // Extract command as buffer first, then convert to string only for processing
            const commandBuffer = buffer.slice(0, crIndex);
            let command = commandBuffer.toString('ascii').trim();
            buffer = buffer.slice(crIndex + 1);
            
            // Apply string stripping and replacement
            THINGS_TO_STRIP.forEach(s => {
                command = command.replace(s, "");
            });
            
            THINGS_TO_REPLACE.forEach(([find, replace]) => {
                command = command.replace(find, replace);
            });
            
            const commandBytes = Buffer.from(command + '\r', 'ascii');
            console.log("WEBTV COMMAND:", commandBytes.toString('ascii').trim());
            
            if (command + '\r' === 'ATD\r') {
                NEXT_RECV_IS_LAST_ASCII = true;
                console.log("ATD detected - next serial response will trigger data mode");
            }
            
            try {
                serialPort.write(commandBytes, (err) => {
                    if (err) {
                        console.error('Error writing command to serial port:', err);
                    } else {
                        // Force immediate transmission of commands too
                        serialPort.drain();
                    }
                });
            } catch (error) {
                console.error('Error writing to serial port:', error);
            }
        } else {
            // In data mode, pass through binary data unchanged with immediate write
            try {
                serialPort.write(data, (err) => {
                    if (err) {
                        console.error('Error writing to serial port:', err);
                    } else {
                        // Force immediate transmission
                        serialPort.drain((drainErr) => {
                            if (drainErr) {
                                console.error('Error draining serial port:', drainErr);
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('Error writing to serial port:', error);
            }
        }
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
        if (DATA_MODE) {
            console.log("Exiting data mode due to socket error");
            DATA_MODE = false;
            NEXT_RECV_IS_LAST_ASCII = false;
            resetModemToCommandMode();
        }
    });

    socket.on('close', () => {
        console.log("Socket closed by remote");
        if (DATA_MODE) {
            console.log("Exiting data mode due to socket disconnect");
            DATA_MODE = false;
            NEXT_RECV_IS_LAST_ASCII = false;
            resetModemToCommandMode();
        }
        currentClient = null;
    });
}

// Handle data from serial to socket
function handleSerialToSocket(socket) {
    const dataHandler = (data) => {
       
        // Check if we're switching to data mode
        if (!DATA_MODE && NEXT_RECV_IS_LAST_ASCII) {
            DATA_MODE = true;
            NEXT_RECV_IS_LAST_ASCII = false;
            // Provide connection result and enable data mode
            data = Buffer.from('79\r\n67\r\n19\r\n', 'ascii');
            console.log("MODEM CONNECT RESULT:", data.toString('ascii'));
            console.log("Data mode enabled");
        } else if (!DATA_MODE) {
            console.log("MODEM COMMAND RESPONSE:", data.toString('ascii'));
        }

        // Check for disabling data mode if unsupported or exit flags are received
        // Use Buffer.equals for binary-safe comparison
        const escapeSeq = Buffer.from("+++\r", 'ascii');
        const exitCode = Buffer.from("3\r", 'ascii');
        
        if (data.equals(escapeSeq) || data.equals(exitCode)) {
            console.log("Data mode disabled by serial response");
            DATA_MODE = false;
        }

        try {
            if (socket && !socket.destroyed) {
                socket.write(data);
            } else {
                console.log("[SERIAL->SOCKET] Cannot send - socket destroyed or null");
            }
        } catch (error) {
            console.error('Send error:', error);
            if (DATA_MODE) {
                console.log("Exiting data mode due to send error");
                DATA_MODE = false;
                NEXT_RECV_IS_LAST_ASCII = false;
                resetModemToCommandMode();
            }
        }
    };

    const errorHandler = (err) => {
        console.error('Serial port error:', err);
        if (DATA_MODE) {
            console.log("Exiting data mode due to serial error");
            DATA_MODE = false;
            NEXT_RECV_IS_LAST_ASCII = false;
            resetModemToCommandMode();
        }
    };

    console.log("[SERIAL] Setting up data and error handlers");
    serialPort.on('data', dataHandler);
    serialPort.on('error', errorHandler);

    // Return cleanup function
    return () => {
        console.log("[SERIAL] Cleaning up event handlers");
        serialPort.removeListener('data', dataHandler);
        serialPort.removeListener('error', errorHandler);
    };
}

// Handle new client connection
function handleClient(socket) {
    // Reset state for new connection
    DATA_MODE = false;
    NEXT_RECV_IS_LAST_ASCII = false;
    console.log("Reset modem state for new connection");
    
    // Disable TCP buffering for immediate data flow
    socket.setNoDelay(true);
    socket.setTimeout(0);
    
    currentClient = socket;
    
    handleSocketToSerial(socket);
    const cleanupSerial = handleSerialToSocket(socket);
    
    socket.on('close', () => {
        // Ensure data mode is reset when client disconnects
        if (DATA_MODE) {
            console.log("Client disconnected, exiting data mode");
            DATA_MODE = false;
            NEXT_RECV_IS_LAST_ASCII = false;
            resetModemToCommandMode();
        }
        
        // Clean up serial event listeners
        cleanupSerial();
        currentClient = null;
    });

    socket.on('error', (err) => {
        console.error('Client socket error:', err);
        cleanupSerial();
        currentClient = null;
    });
}

// Clean shutdown procedure
function cleanup() {
    console.log("Cleaning up...");
    
    // Reset modem if we're in data mode
    if (DATA_MODE) {
        console.log("Resetting modem before shutdown");
        DATA_MODE = false;
        NEXT_RECV_IS_LAST_ASCII = false;
        resetModemToCommandMode();
    }
    
    if (currentClient) {
        currentClient.destroy();
    }
    
    if (server) {
        server.close();
    }
    
    if (serialPort && serialPort.isOpen) {
        serialPort.close();
    }
}

// Signal handlers
process.on('SIGINT', () => {
    console.log('\nReceived interrupt signal, shutting down...');
    cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nReceived terminate signal, shutting down...');
    cleanup();
    process.exit(0);
});

// Main execution
async function main() {
    try {
        // Initialize serial port and wait for it to be ready
        await initSerial();
        
        // Start TCP server
        server = net.createServer((socket) => {
            console.log(`Connection from ${socket.remoteAddress}:${socket.remotePort}`);
            handleClient(socket);
        });
        
        server.listen(TCP_PORT, TCP_IP, () => {
            console.log(`Listening on ${TCP_IP}:${TCP_PORT}...`);
        });
        
        server.on('error', (err) => {
            console.error('Server error:', err);
            cleanup();
            process.exit(1);
        });
    } catch (error) {
        console.error('Failed to initialize:', error);
        process.exit(1);
    }
}

// Start the proxy
if (require.main === module) {
    main();
}

module.exports = {
    main,
    cleanup
};
