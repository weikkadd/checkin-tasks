import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, AlertCircle, Clock, Play } from "lucide-react";
import { useState } from "react";
import { TaskDialog } from "@/components/TaskDialog";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);

  // 获取任务列表
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = trpc.tasks.list.useQuery();

  // 计算统计数据
  const stats = {
    total: tasks.length,
    normal: tasks.filter(t => t.status === "正常").length,
    expiringSoon: tasks.filter(t => t.status === "即将到期").length,
    expired: tasks.filter(t => t.status === "已过期").length,
  };

  // 获取状态颜色和图标
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "正常":
        return { color: "bg-green-100 text-green-800", icon: CheckCircle2, label: "正常" };
      case "即将到期":
        return { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle, label: "即将到期" };
      case "已过期":
        return { color: "bg-red-100 text-red-800", icon: AlertCircle, label: "已过期" };
      case "执行中":
        return { color: "bg-blue-100 text-blue-800", icon: Clock, label: "执行中" };
      default:
        return { color: "bg-gray-100 text-gray-800", icon: CheckCircle2, label: status };
    }
  };

  // 手动触发续期
  const triggerMutation = trpc.triggerRenewal.useMutation({
    onSuccess: () => {
      refetchTasks();
    },
  });

  const handleTriggerRenewal = (taskId: number) => {
    triggerMutation.mutate({ taskId });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">签到自动续期管理</h1>
            <p className="text-muted-foreground mt-2">欢迎回来，{user?.name || "用户"}！</p>
          </div>
          <Button onClick={() => setShowNewTaskDialog(true)} size="lg">
            + 新增任务
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">总任务数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">所有签到任务</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">正常</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.normal}</div>
              <p className="text-xs text-muted-foreground mt-1">状态良好</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-600">即将到期</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
              <p className="text-xs text-muted-foreground mt-1">需要关注</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">已过期</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
              <p className="text-xs text-muted-foreground mt-1">需要立即续期</p>
            </CardContent>
          </Card>
        </div>

        {/* 任务列表 */}
        <Card>
          <CardHeader>
            <CardTitle>任务列表</CardTitle>
            <CardDescription>所有配置的签到任务</CardDescription>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">暂无任务，开始创建您的第一个签到任务吧</p>
                <Button onClick={() => setShowNewTaskDialog(true)}>创建任务</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.map(task => {
                  const statusDisplay = getStatusDisplay(task.status);
                  const StatusIcon = statusDisplay.icon;

                  return (
                    <div key={task.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base">{task.serviceName}</h3>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{task.serviceUrl}</p>
                        </div>
                        <Badge className={statusDisplay.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusDisplay.label}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">签到周期：</span>
                          <span className="font-medium">{task.checkinInterval} 天</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">上次签到：</span>
                          <span className="font-medium">
                            {task.lastCheckinTime ? new Date(task.lastCheckinTime).toLocaleDateString() : "未签到"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">下次签到：</span>
                          <span className="font-medium">
                            {task.nextCheckinTime ? new Date(task.nextCheckinTime).toLocaleDateString() : "未设置"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/logs/${task.id}`)}
                        >
                          日志
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setLocation(`/tasks/${task.id}`)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => handleTriggerRenewal(task.id)}
                          disabled={triggerMutation.isPending}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          立即执行
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 新增任务对话框 */}
      <TaskDialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog} onSuccess={refetchTasks} />
    </DashboardLayout>
  );
}
