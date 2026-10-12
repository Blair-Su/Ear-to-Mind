import { createRoot } from 'react-dom/client';
import Workspace from '../app/workspace/workspace';
createRoot(document.getElementById('root')!).render(<Workspace userName="Demo workspace" userId="demo" demo/>);
