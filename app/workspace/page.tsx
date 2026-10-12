import { requireChatGPTUser } from '@/app/chatgpt-auth';
import Workspace from './workspace';
export const dynamic='force-dynamic';
export default async function WorkspacePage(){const user=await requireChatGPTUser('/workspace');return <Workspace userName={user.fullName||'Your workspace'} userId={user.userId}/>;}
