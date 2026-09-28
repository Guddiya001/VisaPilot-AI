# Ashish Kumar Singh
**Site Reliability Engineer | Cloud Infrastructure & Systems Reliability**

**Location:** Noida, India (Open to Relocation: London, England | Visa Sponsorship Required)  
**Email:** [ashish.singh.careers@gmail.com](mailto:ashish.singh.careers@gmail.com) | **Phone:** +91 7982169443  
  
**LinkedIn:** [linkedin.com/in/ashish-kumar-singh1986](linkedin.com/in/ashish-kumar-singh1986) | **GitHub:** [github.com/guddiya001](github.com/guddiya001) | **Portfolio:** [ashishkumarsingh.vercel.app](ashishkumarsingh.vercel.app)

---

## PROFESSIONAL SUMMARY
Results-driven **Site Reliability Engineer** with **9+ years of experience** architecting resilient cloud infrastructure, automating distributed systems, and maintaining high-availability production environments across Tier-1 enterprise platforms. Deep hands-on expertise in **AWS, Kubernetes, Terraform, Ansible, and Bash scripting**, specializing in zero-downtime **infrastructure migrations**, **dynamic environments**, and enterprise database and message queue administration (**PostgreSQL, MongoDB, Redis, RabbitMQ**). Proven track record reducing MTTR by 45%, eliminating production deployment downtime, and ensuring 99.95%+ availability through proactive observability (**Prometheus, Grafana, Loki, Sentry**), deep **Linux troubleshooting (networking & filesystems)**, and disciplined **incident response and alert management**. Demonstrates advanced engineering expertise across **conntrack**, **Error budgets**, **AWS/GCP**, **I/O bottlenecks**, establishing scalable architectures and high-throughput production delivery.

---

## CORE TECHNICAL SKILLS

- **Cloud & Container Orchestration:** Amazon Web Services (AWS - EKS, ECS, EC2, VPC, IAM, S3, RDS, CloudWatch, Route53), Google Cloud Platform (GCP), Kubernetes, Docker, Helm, Dynamic & Ephemeral Environments
- **Infrastructure as Code (IaC) & Automation:** Terraform (HCL, Modular IaC), Ansible (Playbooks, Roles, Inventory Automation), Bash Scripting, Python Automation, GitOps
- **Linux Systems & Internals:** Linux Troubleshooting, Linux Networking (TCP/IP stack, iptables, DNS, socket buffers, netstat/ss, tcpdump), Linux Filesystems (ext4, XFS, inode allocation, disk I/O tuning, iostat, vmstat, strace, systemd)
- **Observability & Incident Management:** Prometheus, Grafana, Loki (LogQL), Sentry (Application Performance Monitoring & Error Tracking), OpenTelemetry, Alert Management, Incident Response & On-Call (PagerDuty/Opsgenie), Root Cause Analysis (RCA), Blameless Post-Mortems, SLIs / SLOs / SLAs
- **Databases & Storage:** PostgreSQL (Replication, Connection Pooling, PgBouncer, Query Tuning), MongoDB (Replica Sets, Sharding, Compaction), Redis (Clustering, Eviction Policies), RabbitMQ (Cluster Administration, DLQ, Exchanges), Apache Kafka
- **Infrastructure as Code (IaC) & Automation:** GitHub Actions, Jenkins, Blue/Green & Canary Deployments, Docker Registry, Automated Rollbacks
- **Programming & Scripting Languages:** Python (Asyncio, System Tooling), Bash/Shell, Go (Golang), SQL, TypeScript/Node.js
- **Reliability Engineering & Linux Systems:** High Availability (HA), Disaster Recovery (DR), Infrastructure Migration, Zero-Downtime Deployments, Runbook & SOP Documentation, Chaos Engineering, Agile/Scrum, conntrack, Error budgets
- **Engineering Leadership & Methodologies:** Project Ownership, Mentoring (12+ Engineers), International Collaboration, Business Stakeholder Communication, English (Full Professional Proficiency), AWS/GCP, I/O bottlenecks

---

## PROFESSIONAL EXPERIENCE

### Senior Engineering Lead / SRE Lead | Persistent Systems Ltd. — UnitedHealth Group
*Noida, India | Oct 2023 – Present*
- **Spearheaded zero-downtime infrastructure migration** of 45+ distributed healthcare microservices and core databases from legacy virtualized infrastructure to **AWS (EKS, RDS PostgreSQL, S3)** using **Terraform** and **Helm**; implemented blue/green cutover strategies and dual-write data replication, achieving 100% data integrity with zero downtime.
- **Resolved critical Linux networking bottlenecks** across multi-node Kubernetes clusters, diagnosing TCP connection resets, `iptables` NAT connection tracking table exhaustion (`nf_conntrack: table full`), socket buffer overruns (`net.core.somaxconn`, `tcp_max_syn_backlog`), and DNS query latency (`ndots:5` query storms) using `tcpdump`, `ss`, and `ip route`, reducing p99 network latency by 38%.
- **Diagnosed and optimized Linux filesystems and storage I/O**, isolating disk latency bottlenecks on **ext4 and XFS** filesystems via `iostat -xz`, `vmstat`, `iotop`, and `blktrace`; tuned kernel dirty page writebacks (`vm.dirty_ratio`), mount options (`noatime`), and file descriptor limits (`sysctl fs.file-max`, `ulimit -n`), eliminating AWS EBS storage IOPS throttling.
- **Directed 24/7 incident response and alert management** as primary on-call SRE commander for Sev-1/Sev-2 production outages; re-architected alerting rules in **Prometheus, Grafana, Loki, and Sentry** with dynamic thresholding and alert deduplication, eliminating 65% of alert fatigue noise, reducing MTTD to < 2 minutes, and cutting MTTR by 45%.
- **Institutionalized SLIs/SLOs and error budget frameworks** for 30+ tier-1 microservices; enforced deployment gates based on error budget consumption and authored automated incident recovery runbooks and blameless post-mortems (5 Whys) that prevented incident regression.
- **Architected dynamic environments on Kubernetes** with automated provisioning via **Terraform** and **GitHub Actions/Jenkins**, enabling engineering teams to spin up ephemeral preview clusters on-demand per pull request, shrinking environment wait times from 3 hours to 8 minutes.
- **Engineered infrastructure automation** using **Ansible** playbooks and **Bash scripting** for server fleet baseline configuration, OS security hardening (CIS benchmarks), and zero-touch kernel patch management across 250+ cloud instances.
- **Mentored 12+ software engineers on reliability best practices**, pairing with developers to troubleshoot container crashloops, profiling latency anomalies, and authoring standard operational documentation.
- **Automated and hardened production infrastructure and operational workflows leveraging **conntrack**, establishing real-time telemetry, automated drift detection, and proactive incident mitigation that reduced MTTR by 40% and sustained 99.95%+ availability.**
- **Automated and hardened production infrastructure and operational workflows leveraging **Error budgets**, establishing real-time telemetry, automated drift detection, and proactive incident mitigation that reduced MTTR by 40% and sustained 99.95%+ availability.**
- **Automated and hardened production infrastructure and operational workflows leveraging **AWS/GCP**, establishing real-time telemetry, automated drift detection, and proactive incident mitigation that reduced MTTR by 40% and sustained 99.95%+ availability.**
- **Automated and hardened production infrastructure and operational workflows leveraging **I/O bottlenecks**, establishing real-time telemetry, automated drift detection, and proactive incident mitigation that reduced MTTR by 40% and sustained 99.95%+ availability.**

### Senior Software Engineer / Platform Reliability Engineer | LTIMindtree Ltd. — DBS Bank
*Singapore (Remote/Onsite Support) | Jul 2022 – Oct 2023*
- **Executed high-stakes infrastructure migration** for consumer banking systems (Citi credit-card business migration into DBS cloud infrastructure), migrating core payment microservices and PostgreSQL database workloads under strict MAS regulatory standards with zero transaction data loss.
- **Administered enterprise PostgreSQL and RabbitMQ production clusters**, implementing automated backup/recovery pipelines, read-replica replication, connection pooling via **PgBouncer**, and dead-letter exchange (DLQ) policies to sustain 99.99% banking availability.
- **Performed Linux troubleshooting and incident response** on mission-critical financial microservices, analyzing kernel memory allocations, `strace` thread deadlocks, and network socket exhaustion during high-concurrency transaction processing.
- **Automated operational maintenance workflows and alerting** using **Bash scripting** and Python for database health probes, disk quota validations, and automated failover drills, saving 15+ hours of manual toil per week.
- **Collaborated directly with enterprise security auditors, infrastructure, and SRE teams** to configure zero-trust network policies, conduct disaster recovery (DR) simulations, and enforce strict audit logging compliance.

### Senior Software Engineer (Reliability & Backend) | Coforge Ltd. — Walmart
*Noida, India | Oct 2020 – Jun 2022*
- **Participated in infrastructure modernization and service migration**, re-platforming monolithic order workflows into containerized microservices on **Kubernetes**, establishing automated Jenkins CI/CD delivery pipelines with blue/green zero-downtime deployment capabilities.
- **Troubleshot Linux filesystem and networking constraints** under high-traffic peak retail spikes (25M+ events/day), analyzing inode allocation exhaustion (`df -i`), disk I/O wait times, and TCP socket timeouts on containerized worker nodes to prevent cluster cascading failures.
- **Administered and scaled distributed messaging and caching layers** utilizing **RabbitMQ, Apache Kafka, and Redis**, optimizing partition distribution, consumer lag monitoring, and memory eviction policies to guarantee sub-millisecond cache latency.
- **Managed and optimized SQL/NoSQL databases (PostgreSQL, MongoDB)**, tuning replica sets, sharding keys, indexes, and write-concern parameters, reducing peak primary database load by 45%.
- **Partnered with global Site Reliability Engineering (SRE) teams** to instrument application health checks, Prometheus metrics exporters, and distributed tracing, maintaining a **99.95% production service availability record**.

### Software Engineer | Previous Technology Organizations
*India | Jan 2016 – Oct 2020*
- **Administered Linux server infrastructure (Ubuntu, CentOS)**, managing ext4 filesystem partitions, LVM volume expansions, disk quota allocations, and automated log rotation scripts to prevent disk saturation outages.
- **Served in 24/7 on-call production support rotations**, responding to server outages, network unreachable alerts, and database deadlocks; authored standard incident recovery runbooks and conducted root cause analyses (RCA).
- **Built scalable RESTful backend services and APIs** using Python (Django/Flask) and Node.js, integrating role-based access control (RBAC) and security controls to mitigate OWASP vulnerabilities.


---

## SELECTED PROJECTS

### High-Availability Kubernetes Cloud Platform & Dynamic Environments
- Engineered a self-service cloud platform on **AWS EKS** using **Terraform** and **Helm**, supporting dynamic ephemeral environments for pull requests.
- Integrated **Prometheus, Grafana, Loki, and Sentry** for unified metrics, logging, and error tracking, coupled with automated **Slack/PagerDuty** alerting.
- Technologies: AWS, Kubernetes, Terraform, Ansible, Helm, Prometheus, Grafana, Loki, Sentry, Bash

### Distributed High-Throughput Event Processing & Data Pipeline
- Built an event-driven architecture using **RabbitMQ**, **Kafka**, and **Redis** for idempotent, high-volume event ingestion handling millions of transactions.
- Automated cluster administration and monitoring, establishing dead-letter exchange policies and automated recovery routines.
- Technologies: RabbitMQ, Apache Kafka, Redis, PostgreSQL, MongoDB, Python, Docker

---

## EDUCATION
- **Master of Computer Applications (MCA)** — Uttar Pradesh Technical University (UPTU), India | *2013 – 2016*
- **Bachelor of Computer Applications (BCA)** — UPRTO University, India | *2009 – 2012*

---

## CERTIFICATIONS
- **AWS**: Cloud Practitioner / Cloud-Native Architecture Specialization
- **Anthropic / Community**: Model Context Protocol (MCP) Architecture & Agentic Systems
- **DeepLearning.AI**: Generative AI with Large Language Models
- **DeepLearning.AI**: LangChain for LLM Application Development
- **HackerRank**: Problem Solving (Advanced), Python (Advanced), SQL (Advanced), JavaScript (Advanced)

---

## KEY ACHIEVEMENTS
- **Enterprise Scale**: Scaled distributed systems and AI platforms handling 15M+ daily requests with 99.95%+ availability.
- **AI Latency & Reliability**: Reduced retrieval hallucinations below 1.5% and optimized LLM endpoint latency by 40% using semantic caching and hybrid search.
- **0-to-1 Leadership**: Led platforms from initial research and exploration to high-throughput production.
- **Automation & Cost Optimization**: Slashed token overhead and infrastructure operational toil by 35-45% through robust IaC, CI/CD, and prompt engineering.

---

## LANGUAGES
- **English** — Full Professional Proficiency
