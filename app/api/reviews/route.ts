import { z } from 'zod';
import { reviewKindSchema } from '@/lib/research';
import { createReview,listReviews,cancelReview } from '@/lib/server-store';
import { owner,json,body,checkOrigin,failure } from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const user=await owner(),id=new URL(request.url).searchParams.get('projectId');return json({reviews:await listReviews(user,id||undefined)});}catch(e){return failure(e);}}
export async function POST(request:Request){try{checkOrigin(request);const user=await owner(),data=z.object({projectId:z.string().min(1).max(100),kind:reviewKindSchema,targetId:z.string().min(1).max(100),question:z.string().max(1500).default('')}).parse(await body(request,6000));return json(await createReview(user,data.projectId,data.kind,data.targetId,data.question),201);}catch(e){return failure(e);}}
export async function DELETE(request:Request){try{checkOrigin(request);const user=await owner(),data=z.object({id:z.string().min(1).max(100)}).parse(await body(request,1000));await cancelReview(user,data.id);return json({cancelled:true});}catch(e){return failure(e);}}
