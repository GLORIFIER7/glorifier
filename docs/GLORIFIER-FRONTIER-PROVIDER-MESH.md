# GLORIFIER Frontier Provider Mesh

## Objective

GLORIFIER is provider-neutral. The orchestration layer should be able to use multiple major frontier-model and inference providers without hard-coding one vendor as the permanent intelligence source.

This mesh currently defines integration slots for:

- OpenAI
- Google Gemini
- Anthropic Claude
- Meta Llama
- xAI
- Mistral
- DeepSeek
- Alibaba Qwen
- NVIDIA NIM
- Groq
- Together AI
- Fireworks AI

Additional enterprise/cloud providers can be added through the same adapter contract.

## Selection policy

GLORIFIER does **not** declare a permanent "highest computing power company." Provider/model capability changes over time, and public model capability is not identical to infrastructure compute capacity.

Instead, the AI CEO/executive layer evaluates currently connected providers using:

1. configured model capability metadata;
2. response quality evaluation;
3. trust status;
4. provider reliability;
5. latency;
6. availability and quota state.

The highest-ranked *currently connected and trusted* candidate may be selected for a task, while other providers remain available for fallback, collaboration, and consensus.

## Connection policy

A provider is only considered connected when its required credentials and endpoint configuration are present. GLORIFIER must never claim a provider is connected merely because an integration slot exists.

Credentials remain server-side. Connection authorization and consequential actions remain governed by the GLORIFIER connection registry, GATS trust controls, and human authority.

## Economic and governance rules

- Provider availability is not evidence of business value or revenue.
- Model output is not automatically evidence.
- Estimated capability is not verified performance.
- GLORIFIER never invents provider access, contracts, earnings, or payments.
- Quota failures trigger provider cooldown and fallback rather than fabricated results.
- A quarantined model cannot execute through the orchestrator.
- Human authority remains above the AI CEO/executive layer.

## Current status

The mesh is an integration framework. Individual providers become operational only after their own credentials, endpoint requirements, quotas, and authorization are configured and verified.
