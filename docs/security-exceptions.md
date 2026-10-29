# POC security scan exceptions

Checkov and Trivy are configured to fail on findings unless an exception below applies. Exceptions stay visible in scan output. Revisit them before changing the POC architecture or using this setup beyond a demo.

| Scanner check | Current reason for exception |
|---|---|
| CKV_AZURE_33 | Queue logging is not configured because this POC does not use Storage Queues. |
| CKV_AZURE_59, CKV2_AZURE_33, AZU-0012 | The state backend uses a public endpoint so GitHub-hosted runners can reach it. Blob access is private and uses Entra ID/OIDC. A private runner and VNet are needed before restricting the endpoint. Trivy's AZU-0012 exception is scoped to the bootstrap storage-account file. |
| CKV_AZURE_206 | The state account uses LRS to keep the short-lived demo inexpensive; it has no geo-redundancy requirement. |
| CKV_AZURE_139 | ACR's public endpoint is required for the hosted GitHub runner to push images. |
| CKV_AZURE_167 | The registry retains SHA-tagged images for this short-lived demo; configure a retention policy when defining image cleanup requirements. |
| CKV_AZURE_165, CKV_AZURE_233, CKV_AZURE_237 | Geo-replication, zone redundancy, and dedicated data endpoints require higher-tier ACR capabilities that this single-region demo does not use. |
| CKV_AZURE_166, CKV_AZURE_164 | Registry image quarantine and signed-image enforcement are not configured in this demo. |
| CKV2_AZURE_38, CKV2_AZURE_41, CKV2_AZURE_40, CKV2_AZURE_21, CKV2_AZURE_1 | Blob soft-delete, SAS expiry policy, shared-key disablement, diagnostic logging, and customer-managed keys are not currently configured. The backend uses Entra ID/OIDC and private blob containers; add and validate these controls before treating the state account as production-ready. |

A finding outside this list fails the relevant check. Trivy image scanning blocks on HIGH and CRITICAL vulnerabilities.
