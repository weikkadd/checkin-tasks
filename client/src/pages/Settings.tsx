import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    gotifyServerUrl: "",
    gotifyToken: "",
    notificationEnabled: 1,
    notifyOnSuccess: 1,
    notifyOnFailure: 1,
    notifyOnExpiringSoon: 1,
    cronSchedule: "0 */6 * * *",
    expiringThresholdDays: 3,
  });

  const [isSaving, setIsSaving] = useState(false);

  // 获取系统设置
  const { data: settings } = trpc.settings.get.useQuery();

  // 更新系统设置
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("设置已保存");
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message || "保存失败");
      setIsSaving(false);
    },
  });

  // 验证 Gotify 配置
  const validateMutation = trpc.settings.validateGotify.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Gotify 配置验证成功");
      } else {
        toast.error("Gotify 配置验证失败");
      }
    },
    onError: (error) => {
      toast.error(error.message || "验证失败");
    },
  });

  // 初始化表单数据
  useEffect(() => {
    if (settings) {
      setFormData({
        gotifyServerUrl: settings.gotifyServerUrl || "",
        gotifyToken: settings.gotifyToken || "",
        notificationEnabled: settings.notificationEnabled ?? 1,
        notifyOnSuccess: settings.notifyOnSuccess ?? 1,
        notifyOnFailure: settings.notifyOnFailure ?? 1,
        notifyOnExpiringSoon: settings.notifyOnExpiringSoon ?? 1,
        cronSchedule: settings.cronSchedule || "0 */6 * * *",
        expiringThresholdDays: settings.expiringThresholdDays || 3,
      });
    }
  }, [settings]);

  const handleSave = () => {
    setIsSaving(true);
    updateMutation.mutate(formData);
  };

  const handleValidateGotify = async () => {
    if (!formData.gotifyServerUrl || !formData.gotifyToken) {
      toast.error("请先填写 Gotify 服务器地址和 Token");
      return;
    }
    try {
      await validateMutation.mutateAsync({
        serverUrl: formData.gotifyServerUrl,
        token: formData.gotifyToken,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
          <p className="text-muted-foreground mt-2">配置自动续期系统的全局参数</p>
        </div>

        {/* Gotify 通知配置 */}
        <Card>
          <CardHeader>
            <CardTitle>Gotify 通知配置</CardTitle>
            <CardDescription>配置 Gotify 服务器以接收续期通知</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gotifyServerUrl">Gotify 服务器地址</Label>
              <Input
                id="gotifyServerUrl"
                placeholder="https://gotify.example.com"
                value={formData.gotifyServerUrl}
                onChange={(e) => setFormData({ ...formData, gotifyServerUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">例如：https://push.example.com</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gotifyToken">Gotify Token</Label>
              <Input
                id="gotifyToken"
                placeholder="输入您的 Gotify Token"
                type="password"
                value={formData.gotifyToken}
                onChange={(e) => setFormData({ ...formData, gotifyToken: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">从 Gotify 应用页面获取</p>
            </div>

            <Button
              variant="outline"
              onClick={() => handleValidateGotify()}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? "验证中..." : "验证配置"}
            </Button>
          </CardContent>
        </Card>

        {/* 通知开关 */}
        <Card>
          <CardHeader>
            <CardTitle>通知设置</CardTitle>
            <CardDescription>选择何时接收通知</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>启用通知</Label>
                <p className="text-sm text-muted-foreground">全局启用或禁用所有通知</p>
              </div>
            <Switch
              checked={formData.notificationEnabled === 1}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notificationEnabled: checked ? 1 : 0 })
              }
            />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>续期成功通知</Label>
                <p className="text-sm text-muted-foreground">任务成功续期时发送通知</p>
              </div>
            <Switch
              checked={formData.notifyOnSuccess === 1}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notifyOnSuccess: checked ? 1 : 0 })
              }
            />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>续期失败通知</Label>
                <p className="text-sm text-muted-foreground">任务续期失败时发送通知</p>
              </div>
            <Switch
              checked={formData.notifyOnFailure === 1}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notifyOnFailure: checked ? 1 : 0 })
              }
            />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>即将到期通知</Label>
                <p className="text-sm text-muted-foreground">任务即将到期时发送提醒</p>
              </div>
            <Switch
              checked={formData.notifyOnExpiringSoon === 1}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notifyOnExpiringSoon: checked ? 1 : 0 })
              }
            />
            </div>
          </CardContent>
        </Card>

        {/* 定时调度配置 */}
        <Card>
          <CardHeader>
            <CardTitle>定时调度配置</CardTitle>
            <CardDescription>设置自动续期检查的频率</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cronSchedule">Cron 表达式</Label>
              <Input
                id="cronSchedule"
                placeholder="0 */6 * * *"
                value={formData.cronSchedule}
                onChange={(e) => setFormData({ ...formData, cronSchedule: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                使用标准 Cron 格式。例如：0 */6 * * * 表示每 6 小时检查一次
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiringThresholdDays">即将到期提醒（天数）</Label>
              <Input
                id="expiringThresholdDays"
                type="number"
                min="1"
                max="30"
                value={formData.expiringThresholdDays}
                onChange={(e) =>
                  setFormData({ ...formData, expiringThresholdDays: parseInt(e.target.value) || 3 })
                }
              />
              <p className="text-xs text-muted-foreground">
                当任务将在指定天数内到期时，发送提醒通知
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline">取消</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存设置"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
