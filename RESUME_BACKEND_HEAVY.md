# Ashish Kumar Singh
**Senior Staff Software Engineer | Distributed Systems & High-Concurrency Backend Lead**

**Location:** Noida, India (Open to Relocation: Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required)  
**Email:** [ashish.singh.careers@gmail.com](mailto:ashish.singh.careers@gmail.com) | **Phone:** +91 7982169443  
**LinkedIn:** [linkedin.com/in/ashish-kumar-singh1986](https://www.linkedin.com/in/ashish-kumar-singh1986) | **GitHub:** [github.com/guddiya001](https://github.com/guddiya001) | **Portfolio:** [ashishkumarsingh.vercel.app](https://ashishkumarsingh.vercel.app)

---

## PROFESSIONAL SUMMARY
Staff- and Senior-level Backend & Distributed Systems Engineer with **9+ years of experience** architecting, scaling, and operating high-throughput microservices, event-driven streaming architectures, and mission-critical cloud backends across Tier-1 healthcare, consumer banking, and global retail e-commerce. Proven track record handling **15M+ to 25M+ daily requests/events** under stringent latency budgets, driving a **40% reduction in endpoint latency and 45% reduction in primary database load**. Deep polyglot backend mastery in **Python (Asyncio, FastAPI), Go (Golang), Java (Spring Boot), Node.js, and TypeScript**, with extensive experience managing enterprise message queues (**Apache Kafka, RabbitMQ**), distributed caching (**Redis**), and relational/NoSQL datastores (**PostgreSQL, MongoDB, MySQL**). Expert in **PgBouncer connection pooling, database query plan tuning, sharding, zero-downtime database migrations, gRPC/RESTful API design, Linux systems internals, and container orchestration on AWS (EKS) and Kubernetes**—consistently maintaining 99.95%+ production availability under strict regulatory frameworks (HIPAA, MAS).

---

## CORE TECHNICAL SKILLS

- **Backend & Distributed Systems:** Distributed Systems Architecture, Microservices Decomposition, High-Concurrency Systems, Event-Driven Architecture, RESTful APIs, gRPC, Protocol Buffers, Asynchronous Processing, Idempotent Processing, CQRS, Service Mesh
- **Programming & Scripting Languages:** Python (Asyncio, FastAPI, Django), Go (Golang, Goroutines, Channels), Java (Spring Boot, Hibernate), Node.js, TypeScript, SQL, Bash/Shell Scripting
- **Message Queues & Streaming:** Apache Kafka (Topics, Partitions, Consumer Groups, Schema Registry), RabbitMQ (Exchanges, Queues, DLQ Policies, Clustering), Event Sourcing, Pub/Sub Messaging
- **Databases & Data Engineering:** PostgreSQL (Streaming Replication, PgBouncer, Query Plan Tuning EXPLAIN ANALYZE, Indexing, Partitioning), MongoDB (Replica Sets, Sharding Keys, Write Concerns), Redis (Clustering, Sentinel, Eviction Policies, Distributed Locks), MySQL, DynamoDB, Schema Migrations
- **Cloud & Container Infrastructure:** Amazon Web Services (AWS - EKS, ECS, Lambda, RDS, S3, SQS, SNS, Route53, IAM), Microsoft Azure, Docker, Kubernetes (Deployments, Services, Ingress, HPA), Helm, Terraform (IaC), Zero-Downtime Deployments (Blue/Green, Canary)
- **Linux Systems & Performance Tuning:** Linux Troubleshooting, TCP/IP Socket Buffers (`net.core.somaxconn`), `iptables`, Kernel Tuning, Disk I/O Optimization (`iostat`, `vmstat`, `strace`), Resource Limits (`ulimit`)
- **Observability & Incident Management:** OpenTelemetry, Prometheus, Grafana, Loki, Sentry, DataDog, APM Distributed Tracing, Alert Management, 24/7 Incident Response, Root Cause Analysis (RCA), SLIs / SLOs / Error Budgets
- **Engineering Practices & Compliance:** Test-Driven Development (PyTest, JUnit, Jest), CI/CD Automation (GitHub Actions, Jenkins), OAuth 2.0 / JWT Authentication, RBAC, HIPAA & MAS Banking Compliance, Agile/Scrum Leadership

---

## PROFESSIONAL EXPERIENCE

### Senior Engineering Lead / Backend Platform Lead | Persistent Systems Ltd. — UnitedHealth Group
*Noida, India | Oct 2023 – Present*
- **Architected and scaled high-throughput distributed microservices and REST/gRPC backend APIs** using **Python (Asyncio, FastAPI) and Go (Golang)**, processing **15M+ daily requests** across distributed clinical healthcare services with a **40% reduction in p99 endpoint latency**.
- **Spearheaded zero-downtime infrastructure and database migration** of 45+ healthcare microservices and core **PostgreSQL** workloads to **AWS (EKS, RDS PostgreSQL)** using **Terraform** and **Helm**; implemented canary cutovers and dual-write data replication, achieving 100% data integrity with zero downtime.
- **Optimized enterprise PostgreSQL databases**, configuring **PgBouncer** connection pooling, tuning query execution plans via `EXPLAIN ANALYZE`, and designing composite index strategies that reduced average database query response time by **32%**.
- **Engineered secure API gateway and service-to-service communication layers** using **gRPC and RESTful protocols**, enforcing OAuth 2.0 / JWT authentication, role-based access control (RBAC), and strict HIPAA healthcare compliance.
- **Diagnosed and eliminated critical Linux networking bottlenecks** across multi-node Kubernetes clusters, resolving socket buffer overruns (`net.core.somaxconn`, `tcp_max_syn_backlog`) and connection tracking saturation using `tcpdump` and `ss`, cutting p99 network latency by **38%**.
- **Built end-to-end distributed observability pipelines** with **OpenTelemetry, Prometheus, and Grafana**, capturing service latency metrics, error budgets, and database connection pool saturation in real time.
- **Directed 24/7 on-call incident management** for mission-critical backend systems; authored automated recovery runbooks and eliminated 65% of false-positive alert noise, reducing MTTR by **45%**.
- **Mentored 12+ backend software engineers** across design reviews, distributed systems patterns, database transaction isolation levels, and automated testing suites with **PyTest**.

### Senior Software Engineer (Core Banking Microservices & Data) | LTIMindtree Ltd. — DBS Bank
*Singapore Banking Domain (Remote/Onsite Support) | Jul 2022 – Oct 2023*
- **Developed resilient consumer banking microservices and transaction processing engines** using **Java (Spring Boot), Python, and PostgreSQL** under strict **Monetary Authority of Singapore (MAS)** regulatory standards with **zero transaction data loss**.
- **Executed high-stakes core banking migration** (Citi credit-card business migration into DBS cloud infrastructure), migrating payment microservices and high-concurrency database workloads with zero regulatory non-compliance.
- **Administered enterprise PostgreSQL and RabbitMQ production clusters**, implementing automated backup/recovery pipelines, read-replica streaming, connection pooling, and dead-letter exchange (DLQ) retry policies to sustain **99.99% banking availability**.
- **Optimized high-concurrency database queries, table indexing, and partition schemes** in PostgreSQL and Oracle, decreasing transaction query execution times by **30%** for end-of-day financial reconciliation.
- **Constructed asynchronous event processing modules** with idempotent consumer patterns, guaranteeing exactly-once transaction processing and comprehensive audit logging.
- **Implemented automated testing suites** using **JUnit, Mockito, and Testcontainers**, maintaining **85%+ test coverage** across mission-critical financial backend components.
- **Partnered directly with enterprise security auditors and international infrastructure teams**, conducting disaster recovery drills and penetration test remediation.

### Senior Software Engineer (Distributed Systems & Messaging) | Coforge Ltd. — Walmart
*Noida, India | Oct 2020 – Jun 2022*
- **Engineered distributed backend microservices and event streaming pipelines** utilizing **Apache Kafka and RabbitMQ**, reliably processing **25M+ events/day** during peak holiday retail spikes with sub-millisecond cache latency via **Redis**.
- **Implemented multi-tier caching architectures** with **Redis Cluster** and tuned relational/document databases (**PostgreSQL, MongoDB**), reducing peak load on primary database instances by **45%**.
- **Architected idempotent order ingestion workflows** with distributed locking mechanisms (Redlock), completely preventing duplicate order placement and race conditions during high-volume flash sales.
- **Modernized monolithic retail workflows into containerized microservices** on **Kubernetes (Docker)**, establishing automated **Jenkins** CI/CD delivery pipelines with blue/green zero-downtime deployment capabilities.
- **Investigated and resolved Linux filesystem and storage I/O constraints**, tuning inode allocations (`df -i`), writeback caches (`vm.dirty_ratio`), and file descriptor limits (`ulimit -n`) to prevent worker node cascading failures under heavy load.
- **Partnered with global Site Reliability Engineering (SRE) teams** to instrument application health checks and distributed tracing, maintaining a **99.95% production service availability record**.

### Software Engineer (Backend & API Development) | Previous Technology Organizations
*India | Jan 2016 – Oct 2020*
- **Built scalable RESTful backend services and APIs** using **Python (Django/Flask), Node.js, MySQL, and PostgreSQL** across healthcare, insurance, and SaaS domains.
- **Designed normalized relational database schemas, complex views, stored procedures, and triggers** to support high-concurrency transactional workflows and reliable data exports.
- **Implemented security controls** including OAuth 2.0 authentication, JWT token validation, rate limiting, and sanitization middleware to mitigate OWASP Top 10 vulnerabilities.
- **Administered Linux server fleets (Ubuntu, CentOS)**, automating cron jobs, log rotations, database backups, and health monitoring scripts using Bash.
- **Participated in 24/7 on-call production rotations**, responding to database locks, memory exhaustion alerts, and network timeouts; authored blameless post-mortems and root-cause analyses.

---

## SELECTED PROJECTS

### High-Throughput Event Streaming & Distributed Caching Platform
- Architected an event streaming platform processing **25M+ events/day** using **Apache Kafka, RabbitMQ, and Redis Cluster** on AWS EKS with zero message loss.
- Implemented idempotent consumer handlers, dead-letter queue (DLQ) retry topologies, and distributed locking that eliminated race conditions during peak loads.
- Technologies: Apache Kafka, RabbitMQ, Redis, Python, Go, Docker, Kubernetes, AWS

### Zero-Downtime Cloud Microservices Migration
- Directed the zero-downtime cloud migration of 45+ enterprise microservices and **PostgreSQL** databases to **AWS EKS and RDS** using **Terraform and Helm**.
- Configured PgBouncer connection pooling and canary traffic shifting that reduced p99 query latency by 32% while sustaining 100% service uptime during cutover.
- Technologies: PostgreSQL, PgBouncer, AWS EKS, AWS RDS, Terraform, Helm, Docker, Go, Python

### Scalable Multi-Tenant Microservices Architecture
- Designed a cloud-native multi-tenant backend architecture leveraging **Go, Python (FastAPI), and Java (Spring Boot)** with schema-isolated multi-tenancy.
- Implemented gRPC inter-service communication with Protocol Buffers, cutting inter-service serialization overhead by 50% compared to JSON over HTTP.
- Technologies: Go, Python, Java Spring Boot, gRPC, Protocol Buffers, PostgreSQL, Docker, Kubernetes

---

## EDUCATION
- **Master of Computer Applications (MCA)** — Uttar Pradesh Technical University (UPTU), India | *2013 – 2016*
- **Bachelor of Computer Applications (BCA)** — UPRTO University, India | *2009 – 2012*

---

## CERTIFICATIONS
- **AWS**: Cloud Practitioner / Cloud-Native Architecture Specialization
- **HackerRank**: Python (Advanced), SQL (Advanced), Problem Solving (Advanced), JavaScript (Advanced)
- **DeepLearning.AI**: Generative AI with Large Language Models
- **Anthropic / Community**: Model Context Protocol (MCP) Architecture & Agentic Systems

---

## KEY ACHIEVEMENTS
- **High-Throughput Scale**: Scaled distributed backend platforms handling **15M+ to 25M+ daily transactions** with sub-45ms latency and **99.95%+ availability**.
- **Latency & Database Optimization**: Achieved a **40% reduction in endpoint latency** and lowered peak primary database load by **45%** via multi-tier caching and query plan tuning.
- **Zero-Downtime Cloud Migration**: Successfully orchestrated cloud migration of 45+ microservices and PostgreSQL databases with **100% data integrity and zero downtime**.
- **Regulatory Excellence**: Architected consumer banking systems handling high-volume payments under strict **MAS Singapore regulatory standards** with zero transaction loss.

---

## LANGUAGES
- **English** — Full Professional Proficiency
