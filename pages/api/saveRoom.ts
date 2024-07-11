import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/dt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { roomId, lock_status } = req.body;

    if (!roomId || typeof lock_status !== 'boolean') {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    try {
      const query = 'INSERT INTO rooms (room_id, lock_status) VALUES ($1, $2)';
      const values = [roomId, lock_status];

      await pool.query(query, values);
      return res.status(200).json({ message: 'Room saved successfully' });
    } catch (error) {
      console.error('Failed to save room details:', error);
      return res.status(500).json({ error: 'Failed to save room details', details: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
