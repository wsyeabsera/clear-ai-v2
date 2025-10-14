// Producers Compliance Report Tool - Generate compliance report for producers
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ProducersComplianceReportTool extends BaseTool {
  name = "producers_get_compliance_report";
  description = "Generate compliance report for producers showing contract violations and performance";

  schema = {
    params: {
      producer_id: {
        type: "string",
        description: "Producer ID (optional - if not provided, generates report for all producers)",
        required: false,
      },
      date_from: {
        type: "string",
        description: "Start date for analysis (ISO 8601)",
        required: false,
      },
      date_to: {
        type: "string",
        description: "End date for analysis (ISO 8601)",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Compliance report with violations and statistics",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Get producers to analyze
      let producers;
      if (params.producer_id) {
        const producerResponse = await this.get(`/waste-producers/${params.producer_id}`);
        const producerData = producerResponse.data as any;
        producers = producerData.success ? [producerData.data] : [];
      } else {
        const producersResponse = await this.get("/waste-producers");
        const producersData = producersResponse.data as any;
        producers = producersData.success ? producersData.data : [];
      }

      const complianceReport = {
        analysis_period: {
          from: params.date_from || "all_time",
          to: params.date_to || "all_time"
        },
        producers_analyzed: producers.length,
        total_violations: 0,
        compliant_producers: 0,
        non_compliant_producers: 0,
        producer_details: [] as any[]
      };

      // Analyze each producer
      for (const producer of producers) {
        const producerAnalysis = {
          producer_id: producer.id,
          producer_name: producer.name,
          producer_type: producer.type,
          active_contracts: 0,
          total_shipments: 0,
          compliant_shipments: 0,
          violations: [] as string[],
          compliance_rate: 0
        };

        // Get producer's contracts
        const contractsResponse = await this.get("/contracts", { producer_id: producer.id, status: "active" });
        const contractsData = contractsResponse.data as any;
        const contracts = contractsData.success ? contractsData.data : [];
        producerAnalysis.active_contracts = contracts.length;

        if (contracts.length === 0) {
          producerAnalysis.violations.push("No active contracts");
          complianceReport.non_compliant_producers++;
        } else {
          // Get shipments for this producer's contracts
          const facilityIds = contracts.map((c: any) => c.facility_id);
          
          // Get shipments for these facilities
          const shipmentQuery: any = { limit: 1000 };
          if (params.date_from) shipmentQuery.date_from = params.date_from;
          if (params.date_to) shipmentQuery.date_to = params.date_to;
          
          const shipmentsResponse = await this.get("/shipments", shipmentQuery);
          const shipmentsData = shipmentsResponse.data as any;
          const allShipments = shipmentsData.success ? shipmentsData.data : [];
          
          // Filter shipments for this producer's facilities
          const relevantShipments = allShipments.filter((s: any) => facilityIds.includes(s.facility_id));
          producerAnalysis.total_shipments = relevantShipments.length;

          // Analyze each shipment
          for (const shipment of relevantShipments) {
            // Get shipment loads
            const loadsResponse = await this.get("/shipment-loads", { shipment_id: shipment.id });
            const loadsData = loadsResponse.data as any;
            const loads = loadsData.success ? loadsData.data : [];

            let shipmentCompliant = true;
            
            for (const load of loads) {
              const detectedCodes = load.waste_codes_detected || [];
              let loadCompliant = false;
              
              // Check against all contracts for this producer
              for (const contract of contracts) {
                const declaredCodes = contract.waste_types_declared || [];
                const matchingCodes = detectedCodes.filter((code: string) => declaredCodes.includes(code));
                
                if (matchingCodes.length > 0) {
                  loadCompliant = true;
                  break;
                }
              }
              
              if (!loadCompliant && detectedCodes.length > 0) {
                shipmentCompliant = false;
                producerAnalysis.violations.push(`Shipment ${shipment.id}: Undeclared waste codes ${detectedCodes.join(", ")}`);
              }
            }
            
            if (shipmentCompliant) {
              producerAnalysis.compliant_shipments++;
            }
          }

          // Calculate compliance rate
          if (producerAnalysis.total_shipments > 0) {
            producerAnalysis.compliance_rate = (producerAnalysis.compliant_shipments / producerAnalysis.total_shipments) * 100;
          }

          // Classify producer
          if (producerAnalysis.violations.length === 0 && producerAnalysis.total_shipments > 0) {
            complianceReport.compliant_producers++;
          } else {
            complianceReport.non_compliant_producers++;
          }

          complianceReport.total_violations += producerAnalysis.violations.length;
        }

        complianceReport.producer_details.push(producerAnalysis);
      }

      return this.success(complianceReport, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
