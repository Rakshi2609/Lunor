import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CashFlowProvider } from './contexts/CashFlowContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyTasks from './pages/MyTasks';
import FollowUps from './pages/FollowUps';
import RecurringTasks from './pages/RecurringTasks';
import AdminPanel from './pages/AdminPanel';
import TaskDetail from './pages/TaskDetail';
import CreateTask from './pages/CreateTask';
import EditTask from './pages/EditTask';
import CreateRecurringTask from './pages/CreateRecurringTask';
import Profile from './pages/Profile';
import Home from './pages/Home';

// Cash Flow Module
import CashFlowRoute from './components/cashflow/CashFlowRoute';
import CashFlowLayout from './components/cashflow/CashFlowLayout';
import CashFlowOverview from './pages/cashflow/CashFlowOverview';
import BankAccounts from './pages/cashflow/BankAccounts';
import DailyCashPosition from './pages/cashflow/DailyCashPosition';
import CashFlowTransactions from './pages/cashflow/CashFlowTransactions';
import UploadBankData from './pages/cashflow/UploadBankData';
import CashFlowReports from './pages/cashflow/CashFlowReports';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <CashFlowProvider>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/my-tasks" element={<MyTasks />} />
                        <Route path="/follow-ups" element={<FollowUps />} />
                        <Route path="/create-task" element={<CreateTask />} />
                        <Route path="/edit-task/:id" element={<EditTask />} />
                        <Route path="/recurring-tasks" element={<RecurringTasks />} />
                        <Route path="/create-recurring-task" element={<CreateRecurringTask />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/tasks/:id" element={<TaskDetail />} />
                        <Route path="/admin" element={<AdminPanel />} />

                        {/* Cash Flow Sub-Routes (Admin + CFO Gate Protected) */}
                        <Route
                          path="/cashflow"
                          element={
                            <CashFlowRoute>
                              <CashFlowLayout>
                                <CashFlowOverview />
                              </CashFlowLayout>
                            </CashFlowRoute>
                          }
                        />
                        <Route
                          path="/cashflow/accounts"
                          element={
                            <CashFlowRoute>
                              <CashFlowLayout>
                                <BankAccounts />
                              </CashFlowLayout>
                            </CashFlowRoute>
                          }
                        />
                        <Route
                          path="/cashflow/daily-position"
                          element={
                            <CashFlowRoute>
                              <CashFlowLayout>
                                <DailyCashPosition />
                              </CashFlowLayout>
                            </CashFlowRoute>
                          }
                        />
                        <Route
                          path="/cashflow/transactions"
                          element={
                            <CashFlowRoute>
                              <CashFlowLayout>
                                <CashFlowTransactions />
                              </CashFlowLayout>
                            </CashFlowRoute>
                          }
                        />
                        <Route
                          path="/cashflow/upload"
                          element={
                            <CashFlowRoute>
                              <CashFlowLayout>
                                <UploadBankData />
                              </CashFlowLayout>
                            </CashFlowRoute>
                          }
                        />
                        <Route
                          path="/cashflow/reports"
                          element={
                            <CashFlowRoute>
                              <CashFlowLayout>
                                <CashFlowReports />
                              </CashFlowLayout>
                            </CashFlowRoute>
                          }
                        />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </CashFlowProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
