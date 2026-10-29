# POC security scan exceptions

Checkov and Trivy block new findings. The exceptions below are scoped to the current POC architecture and should be reviewed if networking, storage, or registry tiers change.

| Scanner check | Scope and reason |
|---|---|
| CKV_AZURE_33 | Queue logging is not configured because neither storage account uses Storage Queues. |
| CKV_AZURE_59, CKV2_AZURE_33, AZU-0012 | The state account must be reachable by GitHub-hosted runners, and the ticket table account by the public Container Apps environment. Both use HTTPS and Entra authorization. Private endpoints and a private runner/network are needed to remove these findings. Trivy's AZU-0012 exception is limited to the two storage account files. |
| CKV_AZURE_206 | The state and ticket storage accounts use LRS to keep the short-lived demo inexpensive; geo-redundancy is not required. |
| CKV_AZURE_139 | ACR's public endpoint is required for the hosted GitHub runner to push images. |
| CKV_AZURE_167 | The registry retains SHA-tagged images for this short-lived demo; add a retention policy when image cleanup requirements are defined. |
| CKV_AZURE_165, CKV_AZURE_233, CKV_AZURE_237 | Geo-replication, zone redundancy, and dedicated data endpoints require higher-tier ACR features this single-region demo does not use. |
| CKV_AZURE_166, CKV_AZURE_164 | Registry image quarantine and signed-image enforcement are outside this demo's current setup. |
| CKV2_AZURE_38, CKV2_AZURE_41, CKV2_AZURE_40, CKV2_AZURE_21, CKV2_AZURE_1 | These findings concern state-account blob protections and logging/CMK controls. The application ticket account disables shared-key authorization and stores only Table data; the POC does not add diagnostic settings or customer-managed keys. |

A finding outside this list fails the relevant check. Trivy image scanning blocks on HIGH and CRITICAL vulnerabilities.
