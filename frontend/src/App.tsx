import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AgentsPage, WorkflowsPage, ChatPage } from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/chat/:workflowId" element={<ChatPage />} />
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/agents" replace />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/workflows" element={<WorkflowsPage />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
