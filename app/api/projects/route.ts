import { z } from 'zod';
import { projectSchema } from '@/lib/research';
import { listProjects,createProject,saveProject,deleteProject } from '@/lib/server-store';
import { owner,json,body,checkOrigin,failure } from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(){try{return json({projects:await listProjects(await owner())});}catch(e){return failure(e);}}
export async function POST(request:Request){try{checkOrigin(request);const user=await owner(),data=projectSchema.parse(await body(request));return json(await createProject(user,data),201);}catch(e){return failure(e);}}
export async function PUT(request:Request){try{checkOrigin(request);const user=await owner(),data=z.object({project:projectSchema,revision:z.number().int().positive()}).parse(await body(request));return json(await saveProject(user,data.project,data.revision));}catch(e){return failure(e);}}
export async function DELETE(request:Request){try{checkOrigin(request);const user=await owner(),data=z.object({id:z.string().min(1).max(100)}).parse(await body(request));await deleteProject(user,data.id);return json({deleted:true});}catch(e){return failure(e);}}
