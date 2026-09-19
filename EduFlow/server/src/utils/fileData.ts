import fs from 'fs';
import path from 'path';

export const readData = <T>(filename: string): T[] => {
  const filePath = path.join(__dirname, `../data/${filename}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

export const writeData = <T>(filename: string, data: T[]): void => {
  const filePath = path.join(__dirname, `../data/${filename}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};
