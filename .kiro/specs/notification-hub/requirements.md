# Requirements Document - NotificationHub

## Introduction

O **NotificationHub** é uma aplicação central de notificações para fazendas inteligentes. O sistema recebe dados de dispositivos e sensores IoT (temperatura do ar, umidade, umidade do solo, nível de reservatórios, etc.), valida os dados recebidos, aplica regras de negócio pré-configuradas, gera notificações apropriadas e as encaminha para o produtor via canais de comunicação abstratos (WhatsApp, SMS, Email no futuro).

O sistema mantém um histórico completo de eventos, regras disparadas e notificações enviadas, permitindo rastreabilidade total do pipeline de notificações. É um MVP funcional que simula um cenário real de integração entre sistemas Web, dispositivos IoT e serviços de mensageria.

---

## Glossary

- **Event**: Um registro de leitura de um sensor contendo eventId, farmId, deviceId, tipo de medição, valor, unidade e timestamp
- **Farm**: Uma propriedade agrícola identificada unicamente por farmId (ex: farm-001)
- **Device**: Um sensor ou equipamento que envia leituras para o sistema (ex: temperatura, umidade)
- **DeviceId**: Identificador único do dispositivo dentro de uma fazenda
- **SensorType**: O tipo de medição realizada (AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL, EQUIPMENT_STATUS)
- **Notification**: Um alerta gerado quando uma regra de negócio é disparada
- **NotificationRule**: Uma regra que define quando uma notificação deve ser gerada (ex: temperatura > 35°C)
- **Producer**: Um usuário que gerencia uma fazenda e recebe notificações (ex: produtor João Silva)
- **ProducerId**: Identificador único do produtor
- **NotificationProvider**: Um serviço abstrato responsável por enviar notificações (MockWhatsApp para MVP)
- **EventHistory**: Registro consolidado relacionando evento → regra disparada → notificação gerada → envio → resultado
- **ValidationRule**: Uma regra que define quais dados são válidos (campos obrigatórios, tipos, ranges)
- **DuplicateEvent**: Um evento com mesmos farmId, deviceId, sensorType, value recebido dentro de um curto período (ex: 5 minutos)

---

## Requirements

### Requirement 1: Receber Eventos de Sensores

**User Story:** Como o sistema NotificationHub, eu quero receber eventos de dispositivos/sensores, para que eu possa processar dados de leitura da fazenda em tempo real.

#### Acceptance Criteria

1. WHEN um evento é recebido via API, THE EventReceiver SHALL armazenar o evento com timestamp de recebimento
2. THE Event SHALL conter os campos obrigatórios: eventId, farmId, deviceId, sensorType, value, unit, timestamp
3. WHERE a origem é um dispositivo confiável, THE EventReceiver SHALL aceitar o evento sem autenticação adicional (MVP)
4. IF o payload está vazio ou ausente, THEN THE EventReceiver SHALL rejeitar o evento e retornar status 400

---

### Requirement 2: Validar Dados de Entrada

**User Story:** Como um gestor de dados, eu quero validar todos os eventos recebidos, para que apenas dados corretos sejam processados.

#### Acceptance Criteria

1. THE DataValidator SHALL verificar que todos os campos obrigatórios estão presentes no evento
2. THE DataValidator SHALL verificar que eventId, farmId, deviceId são strings não-vazias
3. THE DataValidator SHALL verificar que sensorType está na lista de tipos suportados (AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL, EQUIPMENT_STATUS)
4. THE DataValidator SHALL verificar que value é um número válido (inteiro ou decimal)
5. THE DataValidator SHALL verificar que unit é uma string válida (ex: "°C", "%", "mm", "L")
6. THE DataValidator SHALL verificar que timestamp é um valor de data/hora válido e não está no futuro
7. IF alguma validação falha, THEN THE DataValidator SHALL rejeitar o evento e registrar o motivo da falha
8. WHEN um evento é rejeitado, THE EventHistory SHALL registrar o evento rejeitado com o erro específico

---

### Requirement 3: Detectar e Tratar Eventos Duplicados

**User Story:** Como gerenciador de notificações, eu quero evitar múltiplas notificações idênticas, para que o produtor não seja bombardeado com alertas.

#### Acceptance Criteria

1. WHEN um evento com mesmos farmId, deviceId, sensorType e value é recebido dentro de 5 minutos de um evento anterior, THE DuplicateDetector SHALL classificá-lo como evento duplicado
2. IF um evento é classificado como duplicado, THEN THE DuplicateDetector SHALL descartar o evento e registrar no histórico
3. WHILE um evento duplicado está em processamento, THE NotificationEngine SHALL não gerar novas notificações para o mesmo sensor/regra
4. THE DuplicateDetector SHALL permitir reprocessamento manual de eventos duplicados se necessário

---

### Requirement 4: Aplicar Regras de Notificação — Temperatura do Ar

**User Story:** Como um produtor, eu quero ser notificado quando a temperatura excede limites críticos, para que eu possa tomar ações preventivas.

#### Acceptance Criteria

1. WHEN um evento AIR_TEMPERATURE é recebido e validado, THE RuleEngine SHALL comparar o value com o limiar de 35°C
2. IF value > 35°C, THEN THE RuleEngine SHALL marcar a regra "HIGH_AIR_TEMPERATURE" como disparada
3. WHEN a regra "HIGH_AIR_TEMPERATURE" é disparada, THE NotificationGenerator SHALL gerar uma notificação com a mensagem: "Temperatura do ar acima do normal: {value}°C"
4. THE NotificationGenerator SHALL incluir no resultado: farmId, deviceId, value, timestamp do evento, e timestamp de geração da notificação

---

### Requirement 5: Aplicar Regras de Notificação — Umidade do Ar

**User Story:** Como um produtor, eu quero ser notificado quando a umidade cai abaixo de níveis críticos, para que eu possa aumentar a irrigação ou proteção.

#### Acceptance Criteria

1. WHEN um evento AIR_HUMIDITY é recebido e validado, THE RuleEngine SHALL comparar o value com o limiar de 30%
2. IF value < 30%, THEN THE RuleEngine SHALL marcar a regra "LOW_AIR_HUMIDITY" como disparada
3. WHEN a regra "LOW_AIR_HUMIDITY" é disparada, THE NotificationGenerator SHALL gerar uma notificação com a mensagem: "Umidade do ar abaixo do normal: {value}%"

---

### Requirement 6: Aplicar Regras de Notificação — Umidade do Solo

**User Story:** Como um produtor, eu quero ser notificado quando a umidade do solo está baixa, para que eu possa ativar sistemas de irrigação.

#### Acceptance Criteria

1. WHEN um evento SOIL_MOISTURE é recebido e validado, THE RuleEngine SHALL comparar o value com o limiar de 20%
2. IF value < 20%, THEN THE RuleEngine SHALL marcar a regra "LOW_SOIL_MOISTURE" como disparada
3. WHEN a regra "LOW_SOIL_MOISTURE" é disparada, THE NotificationGenerator SHALL gerar uma notificação com a mensagem: "Umidade do solo crítica: {value}%"

---

### Requirement 7: Aplicar Regras de Notificação — Nível de Reservatório

**User Story:** Como um produtor, eu quero ser notificado quando o nível de água cai, para que eu possa reabastecer ou verificar vazamentos.

#### Acceptance Criteria

1. WHEN um evento WATER_RESERVOIR_LEVEL é recebido e validado, THE RuleEngine SHALL comparar o value com o limiar de 15%
2. IF value < 15%, THEN THE RuleEngine SHALL marcar a regra "LOW_WATER_RESERVOIR" como disparada
3. WHEN a regra "LOW_WATER_RESERVOIR" é disparada, THE NotificationGenerator SHALL gerar uma notificação com a mensagem: "Nível de água do reservatório crítico: {value}%"

---

### Requirement 8: Aplicar Regras de Notificação — Nível de Silo

**User Story:** Como um produtor, eu quero ser notificado quando o silo está vazio, para que eu possa planejar o reabastecimento.

#### Acceptance Criteria

1. WHEN um evento SILO_LEVEL é recebido e validado, THE RuleEngine SHALL comparar o value com o limiar de 15%
2. IF value < 15%, THEN THE RuleEngine SHALL marcar a regra "LOW_SILO_LEVEL" como disparada
3. WHEN a regra "LOW_SILO_LEVEL" é disparada, THE NotificationGenerator SHALL gerar uma notificação com a mensagem: "Nível do silo crítico: {value}%"

---

### Requirement 9: Aplicar Regras de Notificação — Status de Equipamento

**User Story:** Como um produtor, eu quero ser notificado quando um equipamento falha, para que eu possa reparar ou substituir.

#### Acceptance Criteria

1. WHEN um evento EQUIPMENT_STATUS é recebido e validado, THE RuleEngine SHALL verificar se o value é igual a "FAILURE"
2. IF value = "FAILURE", THEN THE RuleEngine SHALL marcar a regra "EQUIPMENT_FAILURE" como disparada
3. WHEN a regra "EQUIPMENT_FAILURE" é disparada, THE NotificationGenerator SHALL gerar uma notificação com a mensagem: "Falha em equipamento detectada no dispositivo: {deviceId}"

---

### Requirement 10: Enviar Notificações via Provedor Abstrato

**User Story:** Como o sistema, eu quero enviar notificações ao produtor, para que ele receba alertas através de canais de comunicação.

#### Acceptance Criteria

1. WHEN uma notificação é gerada, THE NotificationDispatcher SHALL enviar a notificação através do NotificationProvider configurado
2. WHERE o provider é MockWhatsApp (MVP), THE NotificationDispatcher SHALL simular o envio e retornar sucesso
3. THE NotificationDispatcher SHALL registrar o resultado do envio (sucesso, falha, erro) no histórico
4. IF o envio falha, THEN THE NotificationDispatcher SHALL registrar a falha com o motivo específico
5. THE NotificationProvider SHALL ser abstrato para permitir futura integração com provedores reais (WhatsApp, SMS, Email)

---

### Requirement 11: Manter Histórico de Eventos e Notificações

**User Story:** Como um auditor, eu quero rastrear todos os eventos, regras e notificações, para que eu possa analisar o histórico completo.

#### Acceptance Criteria

1. THE EventHistory SHALL registrar cada evento recebido com status (válido, rejeitado, duplicado)
2. THE EventHistory SHALL registrar cada regra disparada com timestamp de disparo
3. THE EventHistory SHALL registrar cada notificação gerada com conteúdo completo
4. THE EventHistory SHALL registrar cada tentativa de envio com resultado (sucesso, falha) e timestamp
5. WHEN um evento é processado, THE EventHistory SHALL criar uma entrada consolidada relacionando evento → regra → notificação → envio
6. THE EventHistory SHALL ser persistente (banco de dados ou arquivo) para consulta posterior

---

### Requirement 12: Interface Web para Visualização de Fazenda

**User Story:** Como um produtor, eu quero visualizar minha fazenda e sensores, para que eu possa monitorar o status em tempo real.

#### Acceptance Criteria

1. THE WebUI SHALL exibir lista de fazendas cadastradas com informações: farmId, nome da fazenda, número de sensores
2. THE WebUI SHALL permitir seleção de uma fazenda para visualizar detalhes
3. WHEN uma fazenda é selecionada, THE WebUI SHALL exibir lista de dispositivos (sensores) com última leitura conhecida
4. THE WebUI SHALL exibir para cada sensor: deviceId, sensorType, último value, unit, timestamp da última leitura
5. THE WebUI SHALL usar cores/ícones para indicar status crítico (verde = normal, vermelho = crítico, amarelo = aviso)

---

### Requirement 13: Interface Web para Visualização de Eventos

**User Story:** Como um produtor, eu quero visualizar eventos recebidos, para que eu possa acompanhar o histórico de leituras.

#### Acceptance Criteria

1. THE WebUI SHALL exibir lista de eventos da fazenda selecionada com paginação (20 eventos por página)
2. THE WebUI SHALL exibir para cada evento: eventId, deviceId, sensorType, value, unit, timestamp, status (válido, rejeitado, duplicado)
3. THE WebUI SHALL permitir filtragem por sensorType, data/hora, e status
4. THE WebUI SHALL exibir eventos em ordem decrescente de timestamp (mais recentes primeiro)
5. WHERE um evento foi rejeitado, THE WebUI SHALL exibir o motivo da rejeição

---

### Requirement 14: Interface Web para Visualização de Notificações

**User Story:** Como um produtor, eu quero visualizar notificações geradas, para que eu possa acompanhar alertas enviados.

#### Acceptance Criteria

1. THE WebUI SHALL exibir lista de notificações da fazenda selecionada com paginação (20 notificações por página)
2. THE WebUI SHALL exibir para cada notificação: notificationId, regra disparada, mensagem, timestamp de geração, status de envio
3. THE WebUI SHALL permitir filtragem por regra disparada, data/hora, e status de envio
4. THE WebUI SHALL exibir notificações em ordem decrescente de timestamp
5. IF uma notificação falhou no envio, THE WebUI SHALL exibir o motivo e permitir retentativa manual

---

### Requirement 15: Simulador de Leituras de Sensores

**User Story:** Como um desenvolvedor/testador, eu quero simular leituras de sensores, para que eu possa testar o sistema sem dispositivos reais.

#### Acceptance Criteria

1. THE WebUI SHALL exibir formulário para simular eventos com campos: farmId, deviceId, sensorType, value, unit
2. WHEN o formulário é submetido, THE Simulator SHALL criar um evento válido e enviá-lo ao EventReceiver como se fosse um dispositivo real
3. THE Simulator SHALL permitir simular múltiplos eventos em sequência para testar diferentes cenários
4. WHERE um sensorType é selecionado, THE Simulator SHALL sugerir values típicos e ranges válidos para aquele tipo
5. WHEN um evento simulado é processado, THE WebUI SHALL exibir confirmação e permitir ver o resultado imediato no histórico

---

### Requirement 16: Dados de Demonstração

**User Story:** Como um novo usuário, eu quero que o sistema tenha dados pré-carregados, para que eu possa ver exemplos funcionando imediatamente.

#### Acceptance Criteria

1. THE System SHALL incluir uma fazenda de demonstração: "Boa Esperança" (farm-001)
2. THE System SHALL incluir um produtor de demonstração: "João Silva" (producer-001) com telefone +5535999999999
3. THE System SHALL incluir sensores de demonstração de cada tipo em farm-001:
   - Sensor de temperatura do ar (temp-001)
   - Sensor de umidade do ar (humid-001)
   - Sensor de umidade do solo (soil-001)
   - Sensor de nível de reservatório (water-001)
   - Sensor de nível de silo (silo-001)
   - Equipamento com status (equip-001)
4. WHEN o sistema inicia, THE DemoDataLoader SHALL gerar eventos de demonstração que disparam cada regra:
   - Um evento com AIR_TEMPERATURE = 36°C (dispara HIGH_AIR_TEMPERATURE)
   - Um evento com AIR_HUMIDITY = 25% (dispara LOW_AIR_HUMIDITY)
   - Um evento com SOIL_MOISTURE = 15% (dispara LOW_SOIL_MOISTURE)
   - Um evento com WATER_RESERVOIR_LEVEL = 10% (dispara LOW_WATER_RESERVOIR)
   - Um evento com SILO_LEVEL = 12% (dispara LOW_SILO_LEVEL)
   - Um evento com EQUIPMENT_STATUS = "FAILURE" (dispara EQUIPMENT_FAILURE)
5. WHEN o sistema inicia, THE DemoDataLoader SHALL gerar eventos normais (sem disparar regras):
   - Um evento com AIR_TEMPERATURE = 25°C
   - Um evento com AIR_HUMIDITY = 60%
   - Um evento com SOIL_MOISTURE = 45%
   - Um evento com WATER_RESERVOIR_LEVEL = 80%
   - Um evento com SILO_LEVEL = 70%
   - Um evento com EQUIPMENT_STATUS = "OK"

---

### Requirement 17: Rastreabilidade Completa de Pipeline

**User Story:** Como um auditor, eu quero rastrear o pipeline completo de um evento, para que eu possa entender o que aconteceu em cada etapa.

#### Acceptance Criteria

1. WHEN um evento é processado, THE EventHistory SHALL manter um registro único que liga: evento → validação → detecção de duplicata → regras disparadas → notificações geradas → resultados de envio
2. THE EventHistory SHALL ser consultável por eventId, farmId, deviceId, ou período de tempo
3. THE EventHistory entry SHALL incluir timestamps em cada etapa do pipeline
4. WHEN consultada via API, THE EventHistory SHALL retornar uma visão completa e estruturada do processamento
5. IF nenhuma regra é disparada para um evento válido, THE EventHistory SHALL registrar que o evento foi processado sem ação

---

### Requirement 18: Configuração de Farmа e Produtor

**User Story:** Como um administrador, eu quero configurar fazendas e produtores, para que o sistema saiba a qual produtor notificar.

#### Acceptance Criteria

1. THE System SHALL permitir cadastro de novas fazendas com: farmId, nome, produtor responsável (producerId)
2. THE System SHALL permitir cadastro de novos produtores com: producerId, nome, telefone para notificação
3. WHEN um evento é recebido, THE System SHALL validar que o farmId existe e está associado a um produtor
4. IF o farmId não existe, THEN THE System SHALL rejeitar o evento com erro específico
5. THE System SHALL permitir consulta de fazendas e produtores via API ou interface Web

---

## Non-Functional Requirements

### Performance

1. THE System SHALL processar eventos com latência menor que 1 segundo entre recebimento e disparo de notificação (MVP local)
2. THE System SHALL suportar até 100 eventos por segundo (MVP)

### Availability

1. THE System SHALL registrar todos os eventos recebidos antes de processar (durabilidade)
2. IF uma falha ocorre no NotificationProvider, THE System SHALL fila a notificação para retentativa posterior

### Scalability

1. THE System SHALL ser arquiteturado para permitir futura escalabilidade para múltiplas fazendas e milhares de dispositivos
2. THE NotificationProvider interface SHALL ser abstrata para suportar múltiplos provedores simultaneamente no futuro

### Security (MVP Simplificado)

1. THE System SHALL aceitar eventos sem autenticação no MVP (assumindo rede confiável)
2. THE System SHALL registrar origem de cada evento para auditoria futura
