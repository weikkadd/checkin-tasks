import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  taskId?: number;
}

export function TaskDialog({ open, onOpenChange, onSuccess, taskId }: TaskDialogProps) {
  const [formData, setFormData] = useState({
    serviceName: "",
    serviceUrl: "",
    accountUsername: "",
    accountPassword: "",
    checkinInterval: 7,
    executionScript: "",
  });

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("任务创建成功");
      setFormData({
        serviceName: "",
        serviceUrl: "",
        accountUsername: "",
        accountPassword: "",
        checkinInterval: 7,
        executionScript: "",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      serviceName: formData.serviceName,
      serviceUrl: formData.serviceUrl,
      accountUsername: formData.accountUsername,
      accountPassword: formData.accountPassword,
      checkinInterval: formData.checkinInterval,
      executionScript: formData.executionScript || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新增签到任务</DialogTitle>
          <DialogDescription>配置一个新的签到任务，系统将自动定期执行续期</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceName">服务名称 *</Label>
            <Input
              id="serviceName"
              placeholder="例如：印度 VPS、Hax 账户"
              value={formData.serviceName}
              onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceUrl">服务 URL *</Label>
            <Input
              id="serviceUrl"
              placeholder="https://example.com/login"
              type="url"
              value={formData.serviceUrl}
              onChange={(e) => setFormData({ ...formData, serviceUrl: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">账号 *</Label>
              <Input
                id="username"
                placeholder="用户名或邮箱"
                value={formData.accountUsername}
                onChange={(e) => setFormData({ ...formData, accountUsername: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
              <Input
                id="password"
                placeholder="账户密码"
                type="password"
                value={formData.accountPassword}
                onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">签到周期（天）*</Label>
            <Input
              id="interval"
              type="number"
              min="1"
              max="365"
              value={formData.checkinInterval}
              onChange={(e) => setFormData({ ...formData, checkinInterval: parseInt(e.target.value) || 7 })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="script">自定义执行脚本（可选）</Label>
            <Textarea
              id="script"
              placeholder="JavaScript 代码，接收 username 和 password 参数"
              value={formData.executionScript}
              onChange={(e) => setFormData({ ...formData, executionScript: e.target.value })}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              如果不填写，系统将使用默认的登录和签到流程
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "创建中..." : "创建任务"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
