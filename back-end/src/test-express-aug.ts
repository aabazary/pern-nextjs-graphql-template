import { Request } from 'express';

const test = (req: Request) => {
  req.em; // <-- does TypeScript recognize this?
};