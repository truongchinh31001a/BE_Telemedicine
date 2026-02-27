import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export const pickAlias = <T = unknown>(
  source: Record<string, unknown>,
  keys: string[],
  defaultValue?: T,
): T | undefined => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key] as T;
    }
  }
  return defaultValue;
};

export const requireObjectId = (
  value: unknown,
  fieldName: string,
): Types.ObjectId => {
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
    throw new BadRequestException(`${fieldName} must be a valid ObjectId`);
  }
  return new Types.ObjectId(value);
};

export const optionalObjectId = (value: unknown): Types.ObjectId | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
    throw new BadRequestException('Invalid ObjectId');
  }
  return new Types.ObjectId(value);
};

export const toIsoDate = (value: unknown, fieldName: string): Date => {
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date`);
  }
  return parsed;
};

export const idText = (doc: any) => String(doc?._id ?? '');
