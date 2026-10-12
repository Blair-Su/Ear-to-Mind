import { env } from 'cloudflare:workers';
import { projectSchema,feedbackSchema,reviewSnapshot,uid,now,type Project,type SavedProject,type Review,type ReviewKind } from './research';
type ProjectRow={id:string;owner:string;document:string;revision:number;updated_at:string};
type ReviewRow={id:string;owner:string;project_id:string;target_id:string;kind:ReviewKind;snapshot:string;status:Review['status'];feedback:string|null;created_at:string;completed_at:string|null};
const db=()=>{if(!env.DB)throw new Error('Research storage is unavailable.');return env.DB;};
export class StoreError extends Error { status:number;constructor(message:string,status=400){super(message);this.status=status;} }
const decode=(r:ProjectRow):SavedProject=>({project:projectSchema.parse(JSON.parse(r.document)),revision:r.revision,updatedAt:r.updated_at});
const review=(r:ReviewRow):Review=>({id:r.id,projectId:r.project_id,targetId:r.target_id,kind:r.kind,snapshot:JSON.parse(r.snapshot),status:r.status,feedback:r.feedback?feedbackSchema.parse(JSON.parse(r.feedback)):null,createdAt:r.created_at,completedAt:r.completed_at});
export async function listProjects(owner:string){const r=await db().prepare('SELECT * FROM projects WHERE owner = ? ORDER BY updated_at DESC').bind(owner).all<ProjectRow>();return r.results.map(decode);}
export async function getProject(owner:string,id:string){const r=await db().prepare('SELECT * FROM projects WHERE owner = ? AND id = ?').bind(owner,id).first<ProjectRow>();if(!r)throw new StoreError('Project not found.',404);return decode(r);}
export async function createProject(owner:string,project:Project){
  const count=await db().prepare('SELECT COUNT(*) AS total FROM projects WHERE owner = ?').bind(owner).first<{total:number}>();if((count?.total||0)>=40)throw new StoreError('Your workspace has reached its 40 project limit. Export and remove a finished project first.');
  const at=now(),r=await db().prepare('INSERT INTO projects (id,owner,document,revision,updated_at) VALUES (?,?,?,1,?) ON CONFLICT(id) DO NOTHING').bind(project.id,owner,JSON.stringify(project),at).run();if(!r.meta.changes)throw new StoreError('This project already exists. Refresh your workspace.',409);return {project,revision:1,updatedAt:at};
}
export async function saveProject(owner:string,project:Project,revision:number){const at=now(),r=await db().prepare('UPDATE projects SET document = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND owner = ? AND revision = ?').bind(JSON.stringify(project),at,project.id,owner,revision).run();if(!r.meta.changes)throw new StoreError('This project changed in another window. Export your local copy, then load the latest version.',409);return {project,revision:revision+1,updatedAt:at};}
export async function deleteProject(owner:string,id:string){await db().batch([db().prepare('DELETE FROM reviews WHERE owner = ? AND project_id = ?').bind(owner,id),db().prepare('DELETE FROM projects WHERE owner = ? AND id = ?').bind(owner,id)]);}
export async function listReviews(owner:string,projectId?:string){const r=projectId?await db().prepare('SELECT * FROM reviews WHERE owner = ? AND project_id = ? ORDER BY created_at DESC LIMIT 100').bind(owner,projectId).all<ReviewRow>():await db().prepare("SELECT * FROM reviews WHERE owner = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 100").bind(owner).all<ReviewRow>();return r.results.map(review);}
export async function getReview(owner:string,id:string){const r=await db().prepare('SELECT * FROM reviews WHERE owner = ? AND id = ?').bind(owner,id).first<ReviewRow>();if(!r)throw new StoreError('Coaching request not found.',404);return review(r);}
export async function createReview(owner:string,projectId:string,kind:ReviewKind,targetId:string,question:string){
  const {project}=await getProject(owner,projectId);let snapshot:Record<string,unknown>;try{snapshot=reviewSnapshot(project,kind,targetId,question);}catch(e){throw new StoreError(e instanceof Error?e.message:'Unable to prepare review.');}
  const existing=await listReviews(owner,projectId),encoded=JSON.stringify(snapshot);const duplicate=existing.find(r=>r.status==='pending'&&r.kind===kind&&r.targetId===targetId&&JSON.stringify(r.snapshot)===encoded);if(duplicate)return duplicate;
  if(existing.filter(r=>r.status==='pending').length>=20)throw new StoreError('Complete or cancel a pending request before adding more.');
  const id=uid(),at=now();await db().prepare('INSERT INTO reviews (id,owner,project_id,target_id,kind,snapshot,status,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,owner,projectId,targetId,kind,encoded,'pending',at).run();return getReview(owner,id);
}
export async function cancelReview(owner:string,id:string){await db().prepare("UPDATE reviews SET status = 'cancelled' WHERE id = ? AND owner = ? AND status = 'pending'").bind(id,owner).run();}
export async function completeReview(owner:string,id:string,input:unknown){
  const current=await getReview(owner,id),feedback=feedbackSchema.parse(input),encoded=JSON.stringify(feedback);
  if(current.status==='completed'&&JSON.stringify(current.feedback)===encoded)return current;if(current.status!=='pending')throw new StoreError('This request is no longer pending.',409);
  if(current.kind==='statement'&&feedback.checks.length!==6)throw new StoreError('Statement feedback must cover all six rubric criteria.');
  const r=await db().prepare("UPDATE reviews SET status = 'completed', feedback = ?, completed_at = ? WHERE owner = ? AND id = ? AND status = 'pending'").bind(encoded,now(),owner,id).run();if(!r.meta.changes)throw new StoreError('This request changed while you were reviewing it.',409);return getReview(owner,id);
}
