import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/dt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }

    try {
      const result = await pool.query('SELECT lock_status FROM rooms WHERE room_id = $1', [roomId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const lockStatus = result.rows[0].lock_status;
      return res.status(200).json({ lockStatus });
    } catch (error) {
      console.error('Error fetching lock status:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}