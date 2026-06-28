import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, AlertCircle, SkipForward } from "lucide-react";

export default function ExecutionLogs() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // 从 URL 获取任务 ID
  const taskId = parseInt(location.split("/").pop() || "0");

  // 获取任务详情
  const { data: tasks = [] } = trpc.tasks.list.useQuery();
  const task = tasks.find(t => t.id === taskId);

  // 获取执行日志
  const { data: logs = [], isLoading } = trpc.logs.getByTaskId.useQuery({ taskId, limit: 100 });

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "成功":
        return { color: "bg-green-100 text-green-800", icon: CheckCircle2, label: "成功" };
      case "失败":
        return { color: "bg-red-100 text-red-800", icon: AlertCircle, label: "失败" };
      case "跳过":
        return { color: "bg-gray-100 text-gray-800", icon: SkipForward, label: "跳过" };
      default:
        return { color: "bg-gray-100 text-gray-800", icon: CheckCircle2, label: status };
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回仪表板
        </Button>

        {/* 任务信息 */}
        {task && (
          <Card>
            <CardHeader>
              <CardTitle>{task.serviceName}</CardTitle>
              <CardDescription>{task.serviceUrl}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* 执行日志列表 */}
        <Card>
          <CardHeader>
            <CardTitle>执行日志</CardTitle>
            <CardDescription>最近的续期执行记录</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无执行记录</div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const statusDisplay = getStatusDisplay(log.resultStatus);
                  const StatusIcon = statusDisplay.icon;

                  return (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={statusDisplay.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusDisplay.label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(log.executionTime).toLocaleString()}
                            </span>
                          </div>

                          {log.errorMessage && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                              <strong>错误信息：</strong> {log.errorMessage}
                            </div>
                          )}

                          {log.executionDuration && (
                            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                              <strong>执行耗时：</strong> {log.executionDuration}ms
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
