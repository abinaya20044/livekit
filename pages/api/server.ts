
import express from 'express';
import { Pool } from 'pg';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const port = process.env.PORT || 3001;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const wss = new WebSocketServer({ noServer: true });

interface Client {
  ws: WebSocket;
  roomId: string;
}

const clients: Client[] = [];

app.use(express.json());

app.post('./getLockStatus', async (req, res) => {
  const { roomId } = req.body;
  try {
    const result = await pool.query('SELECT lock_status FROM room_status WHERE room_id = $1', [roomId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
    } else {
      res.json({ lock_status: result.rows[0].lock_status });
    }
  } catch (error) {
    res.status(500).json({ error: error as Error });
  }
});

app.post('./toggleLock', async (req, res) => {
  const { roomId, lock_status } = req.body;
  try {
    await pool.query('INSERT INTO room_status (room_id, lock_status) VALUES ($1, $2) ON CONFLICT (room_id) DO UPDATE SET lock_status = $2', [roomId, lock_status]);
    broadcastLockStatus(roomId, lock_status);
    res.json({ lock_status });
  } catch (error) {
    res.status(500).json({ error: error as Error });
  }
});

const broadcastLockStatus = (roomId: string, lock_status: boolean) => {
  clients.forEach(client => {
    if (client.roomId === roomId) {
      client.ws.send(JSON.stringify({ lock_status }));
    }
  });
};

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, request) => {
  const urlParams = new URLSearchParams(request.url?.split('?')[1]);
  const roomId = urlParams.get('roomId') || '';

  clients.push({ ws, roomId });

  ws.on('close', () => {
    clients.splice(clients.findIndex(client => client.ws === ws), 1);
  });
});