//
// Copyright(C) 2005-2014 Simon Howard
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// Network server code
//

#include "net_common.h"

typedef struct
{
    boolean active;
    int player_number;
    net_addr_t *addr;
    net_connection_t connection;
    int last_send_time;
    char *name;

    // If true, the client has sent the NET_PACKET_TYPE_GAMESTART
    // message indicating that it is ready for the game to start.

    boolean ready;

    // Time that this client connected to the server.
    // This is used to determine the controller (oldest client).

    unsigned int connect_time;

    // Last time new gamedata was received from this client

    int last_gamedata_time;

    // recording a demo without -longtics

    boolean recording_lowres;

    // send queue: items to send to the client
    // this is a circular buffer

    int sendseq;
    net_full_ticcmd_t sendqueue[BACKUPTICS];

    // Latest acknowledged by the client

    unsigned int acknowledged;

    // Value of max_players specified by the client on connect.

    int max_players;

    // Observer: receives data but does not participate in the game.

    boolean drone;

    // SHA1 hash sums of the client's WAD directory and dehacked data

    sha1_digest_t wad_sha1sum;
    sha1_digest_t deh_sha1sum;

	// Is this client is playing with the Freedoom IWAD?

    unsigned int is_freedoom;

    // Player class (for Hexen)

    int player_class;

} net_client_t;

#ifndef NET_SERVER_H
#define NET_SERVER_H

// initialize server and wait for connections

void NET_SV_Init(void);

// run server: check for new packets received etc.

void NET_SV_Run(void);

// Shut down the server
// Blocks until all clients disconnect, or until a 5 second timeout

void NET_SV_Shutdown(void);

// Add a network module to the context used by the server

void NET_SV_AddModule(net_module_t *module);

// Register server with master server.

void NET_SV_RegisterWithMaster(void);

#endif /* #ifndef NET_SERVER_H */
