import { getChatGPTUser } from '@/app/chatgpt-auth';
import { StoreError } from './server-store';
import { ZodError } from 'zod';
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
export async function owner(){const user=await getChatGPTUser();if(!user)throw new StoreError('Sign in with ChatGPT to continue.',401);return user.userId;}
export function checkOrigin(request:Request){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)throw new StoreError('This action must come from your workspace.',403);}
export async function body(request:Request,max=2000000){if(Number(request.headers.get('content-length'))>max)throw new StoreError('This file is too large.',413);const text=await request.text();if(text.length>max)throw new StoreError('This file is too large.',413);try{return JSON.parse(text);}catch{throw new StoreError('Invalid JSON.',400);}}
export function failure(e:unknown){if(e instanceof StoreError)return json({error:e.message},e.status);if(e instanceof ZodError)return json({error:'Some data is invalid. Check the fields or import a valid Ear to Mind export.'},400);console.error('Research request failed',e instanceof Error?e.name:'unknown');return json({error:'Unable to reach your research storage. Your changes have not been saved. Please retry.'},503);}
