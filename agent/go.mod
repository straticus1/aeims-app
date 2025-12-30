module github.com/afterdarksys/aeims-agent

go 1.22

require (
	github.com/docker/docker v24.0.7+incompatible
	github.com/grpc-ecosystem/grpc-gateway/v2 v2.18.1
	github.com/oracle/oci-go-sdk/v65 v65.52.1
	github.com/aws/aws-sdk-go-v2 v1.24.0
	github.com/aws/aws-sdk-go-v2/config v1.26.1
	github.com/aws/aws-sdk-go-v2/service/ec2 v1.141.0
	github.com/aws/aws-sdk-go-v2/service/ecs v1.35.0
	github.com/aws/aws-sdk-go-v2/service/route53 v1.35.0
	github.com/prometheus/client_golang v1.18.0
	github.com/spf13/cobra v1.8.0
	github.com/spf13/viper v1.18.2
	go.uber.org/zap v1.26.0
	google.golang.org/grpc v1.60.1
	google.golang.org/protobuf v1.32.0
	gopkg.in/yaml.v3 v3.0.1
)
