import CalendarPage from "./pages/CalendarPage";
import TagsPage from "./pages/TagsPage";
import HistoryPage from "./pages/HistoryPage";

export const routes = [
  // ...既存
  { path: "/calendar", element: <CalendarPage /> },
  { path: "/tags", element: <TagsPage /> },
  { path: "/history", element: <HistoryPage /> },
];
