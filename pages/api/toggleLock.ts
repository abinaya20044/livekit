import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../lib/dt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { roomId, lock_status } = req.body;

    if (!roomId || typeof lock_status !== 'boolean') {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    try {
      const query = 'UPDATE rooms SET lock_status = $1 WHERE room_id = $2 RETURNING *';
      const values = [lock_status, roomId];

      const result = await pool.query(query, values);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Room not found or no rows updated' });
      }

      return res.status(200).json({ lockStatus: lock_status });
    } catch (error) {
      console.error('Failed to update lock status:', error);
      return res.status(500).json({ error: 'Failed to update lock status' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}