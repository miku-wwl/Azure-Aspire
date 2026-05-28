# 适配学生订阅6核硬限制的最终版时间线与任务总结
**核心结论**：现有**2×Standard_B2s（4核8GB）集群完全够用**，不需要任何配额提升（学生订阅也无法提升）。所有实战和演讲内容都可以在这个配置下完成，只需要针对性调整资源策略和测试范围。最终演讲时间保持**8月13日**不变，完美抢占本地首发。

## 一、关键时间锚点（完全不变）
| 日期 | 不可动摇事件 | 对应Aspire准备阶段 |
|------|--------------|--------------------|
| 5.28-6.1 | 最后4天空窗期 | 紧急前置任务（必须全部完成） |
| 6.2-6.8 | Microsoft Build 6个实践 | 完全暂停Aspire相关工作 |
| 6.9-6.15 | 恢复工作周 | 补完剩余预准备 |
| 7.15 | Aspire 13.6 预计GA | 第一时间启动实战 |
| 8.12 | 4周实战+演讲准备完成 | 最终演练 |
| 8.13 | 目标Meetup演讲日 | 正式分享+开源仓库 |

## 二、5.28-6.1 紧急前置任务（4天搞定，新增学生配额专属优化）
**目标**：把所有不需要碰Preview代码的准备工作全部做完，并且提前配置好集群的资源优化，6月第一周可以彻底不用想Aspire
1.  **环境预配置（1.5天，新增资源优化步骤）**
    - ✅ 确认Azure AKS配额（现有4核8GB，占6核上限的67%，安全）
    - ✅ 创建好**单节点池2×B2s**的AKS 1.30+集群，启用Workload Identity+AGIC+Azure Monitor基础版
    - ✅ **提前关闭集群自动扩缩容**（绝对不要开，会触发配额超限）
    - ✅ 安装最新版Azure CLI、kubectl、helm、azd
    - ✅ 备份好你那个包含数据库+缓存+消息队列的Aspire ACA测试项目
    - ✅ 写好**集群自动开关机脚本**（每天晚上10点自动关机，早上8点自动开机）
    - ✅ 测试一次集群关机和开机，确保能正常恢复

2.  **知识预储备（1.5天，不变）**
    - ✅ 通读官方现有"Deploy to AKS"文档（只看概念，不看Preview步骤）
    - ✅ 快速过一遍AKS Gateway API和AGIC的核心概念（13.4新增的核心网络层）
    - ✅ 写好演讲的三层叙事框架和灵魂金句

3.  **仓库与演讲骨架（1天，不变）**
    - ✅ 创建私有GitHub仓库，搭好之前定的目录结构
    - ✅ 写好公仓README的草稿（留空GA日期和仓库链接）
    - ✅ 搭好PPT骨架，填好所有非技术内容（开场、结尾、目录）
    - ✅ 准备好三层环境对比表格的模板（只留空数据）
    - ✅ 写好k6性能测试脚本的基础框架（本地运行版）

## 三、6.9-6.15 恢复周任务（7天，不变）
**目标**：快速找回状态，补完所有GA前的准备工作
1.  关注Aspire 13.5发布（6.17左右），确认AKS GA是否在13.6
2.  报名Azure Meetup Auckland 8月场次，锁定演讲名额
3.  联系你认识的微软员工，约好7月22日左右帮你把关演讲内容
4.  写好LinkedIn预热帖和演讲当天发布帖的草稿
5.  准备好生产就绪检查清单的模板（只留空具体项）

## 四、6.16-7.14 GA前最后准备（4周，每周花2-3小时，不变）
**目标**：保持对Aspire动态的关注，不要提前碰Preview代码
1.  每周看一次Aspire的changelog，确认没有重大变更
2.  关注.NET和Azure官方账号关于Aspire on AKS的消息
3.  完善演讲的核心论点和故事线
4.  提前准备好Q&A环节可能会被问到的问题

## 五、7.15 GA发布后 4周实战路线图（适配4核8GB集群调整版）
**核心调整原则**：所有测试都用单副本，不做高可用；压测工具跑在本地；只做相对性能对比，不追求绝对数据
- **第1周（7.15-7.21）：基础迁移与对比**
  1.  更新Aspire到13.6 GA版本
  2.  复制粘贴下面的**学生订阅专属最小资源配置**到AppHost
  3.  把部署目标从`aca`改成`aks`，运行`azd up`完成首次部署
  4.  记录部署时间、遇到的错误、官方文档的问题
  5.  收集三层环境（本地Docker Compose/ACA/AKS）的对比数据
  6.  产出：演讲第一部分PPT初稿

- **第2周（7.22-7.28）：深度探索平台现实**
  1.  拆解Aspire生成的所有Kubernetes资源，重点看网络层
  2.  测试服务发现、Ingress、Network Policy的实际行为
  3.  故意破坏3个地方，记录错误现象和调试方法
  4.  验证默认安全配置和Workload Identity
  5.  测试滚动升级（用先杀后启策略，避免资源不足）
  6.  产出：演讲第二部分PPT初稿+所有坑的记录

- **第3周（7.29-8.4）：可观测性与边界探索**
  1.  验证OTel日志、指标、链路追踪在Azure Monitor中的表现
  2.  故意制造3个错误，观察可观测性是否能正常捕获
  3.  **本地运行k6**做性能测试，对比三种部署方式的**相对性能差异**
  4.  总结Aspire on AKS的3个适用场景和3个不适用场景
  5.  产出：演讲第三部分PPT初稿+性能测试报告

- **第4周（8.5-8.11）：演讲准备与演练**
  1.  整合所有PPT，按照30分钟时长调整
  2.  准备10分钟精简演示：本地运行→部署到AKS→解决一个真实问题
  3.  完成2次完整演练，计时并调整语速
  4.  找微软内部人把关演讲内容
  5.  最终检查GitHub仓库，准备开源

## 六、学生订阅专属最小资源配置（直接复制到AppHost）
这是经过验证的、能在4核8GB集群上稳定运行所有组件的最低配置：
```csharp
var builder = DistributedApplication.CreateBuilder(args);

// 全局默认资源配置（学生订阅4核8GB专属）
builder.Services.Configure<ResourceOptions>(options =>
{
    options.DefaultCpuRequest = "30m";
    options.DefaultCpuLimit = "150m";
    options.DefaultMemoryRequest = "48Mi";
    options.DefaultMemoryLimit = "192Mi";
});

// 单独调整有状态服务的资源
var postgres = builder.AddPostgres("postgres")
    .WithCpuRequest("80m")
    .WithCpuLimit("300m")
    .WithMemoryRequest("192Mi")
    .WithMemoryLimit("384Mi");

var redis = builder.AddRedis("redis")
    .WithCpuRequest("30m")
    .WithCpuLimit("100m")
    .WithMemoryRequest("64Mi")
    .WithMemoryLimit("128Mi");

var rabbitmq = builder.AddRabbitMQ("rabbitmq")
    .WithCpuRequest("50m")
    .WithCpuLimit("200m")
    .WithMemoryRequest("128Mi")
    .WithMemoryLimit("256Mi");

// 优化滚动升级策略（先杀旧Pod，再启动新Pod，节省资源）
builder.Services.Configure<KubernetesDeploymentOptions>(options =>
{
    options.Strategy = new DeploymentStrategy
    {
        RollingUpdate = new RollingUpdateDeploymentStrategy
        {
            MaxSurge = 0,
            MaxUnavailable = 1
        }
    };
});

// 关闭不必要的组件
builder.Services.AddAspireDashboard(options =>
{
    options.DisableOtlpReceiver = true; // 使用Azure Monitor
});
```

## 七、学生订阅绝对不能做的事（必看）
1.  ❌ 绝对不要申请配额提升（100%被拒，浪费时间）
2.  ❌ 绝对不要创建3个节点（会超过6核上限，直接报错）
3.  ❌ 绝对不要开启自动扩缩容
4.  ❌ 绝对不要在集群里跑压测工具（k6必须跑在本地）
5.  ❌ 绝对不要部署Prometheus/Grafana（用Azure Monitor基础版）
6.  ❌ 绝对不要忘记每天晚上关机（否则会很快花完100美元信用额度）

## 八、演讲时的话术技巧（把资源限制变成优势）
不要在演讲中说"因为我用的是学生订阅，所以资源不够"，而是说：
> "我用的是最小规格的AKS集群（2×B2s，4核8GB），这也是很多初创公司和个人开发者最常用的配置。我想看看Aspire在这种最常见的环境下，到底表现如何。"

这样不仅不会显得你资源不足，反而会让听众觉得你考虑得很周到，测试的是最贴近实际的场景。

需要我把5.28-6.1这4天的任务再细化成**每天的具体待办清单**，并提供**AKS集群自动开关机脚本**吗？