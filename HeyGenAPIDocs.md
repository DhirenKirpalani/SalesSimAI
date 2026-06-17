> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Session Token

> Create session token for authenticated user



## OpenAPI

````yaml /openapi.json post /v1/sessions/token
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/sessions/token:
    post:
      tags:
        - Sessions
      summary: Create Session Token
      description: Create session token for authenticated user
      operationId: create_session_token_v1_sessions_token_post
      requestBody:
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/FullSDKSessionTokenConfigDataSchema'
                - $ref: '#/components/schemas/LiteSDKSessionTokenConfigDataSchema'
              title: Payload
        required: true
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_SDKSessionTokenSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
        - HTTPBearer: []
components:
  schemas:
    FullSDKSessionTokenConfigDataSchema:
      properties:
        mode:
          type: string
          const: FULL
          title: Mode
          default: FULL
        avatar_id:
          type: string
          format: uuid
          title: Avatar Id
        is_sandbox:
          type: boolean
          title: Is Sandbox
          default: false
        video_settings:
          anyOf:
            - $ref: '#/components/schemas/VideoSettings'
            - type: 'null'
          description: Video encoding settings
        max_session_duration:
          title: Max Session Duration
          description: >-
            Maximum session duration in seconds. Must be <= the configured limit
            for your subscription tier.
          type: integer
        avatar_persona:
          $ref: '#/components/schemas/AvatarPersonaSchema'
        interactivity_type:
          $ref: '#/components/schemas/SessionInteractivityTypeEnum'
          default: CONVERSATIONAL
        llm_configuration_id:
          title: Llm Configuration Id
          description: Optional custom LLM configuration ID
          type: string
          format: uuid
        dynamic_variables:
          title: Dynamic Variables
          description: >-
            Values for ${var} placeholders in the context's opening_text and
            prompt. Required keys are derived from the context; extra keys are
            ignored. At most 50 entries; keys <= 64 chars; values <= 1000 chars.
          additionalProperties:
            type: string
          type: object
        memory:
          anyOf:
            - $ref: '#/components/schemas/MemoryRef'
            - type: 'null'
          description: >-
            Attach session memory. Provide `prev_session_id` to seed/reuse from
            a prior session, `session_memory_id` to attach an existing memory,
            or both (must resolve to the same memory_id).
      type: object
      required:
        - avatar_id
        - avatar_persona
      title: Full Mode
    LiteSDKSessionTokenConfigDataSchema:
      properties:
        mode:
          type: string
          const: LITE
          title: Mode
          default: LITE
        avatar_id:
          type: string
          format: uuid
          title: Avatar Id
        is_sandbox:
          type: boolean
          title: Is Sandbox
          default: false
        video_settings:
          anyOf:
            - $ref: '#/components/schemas/VideoSettings'
            - type: 'null'
          description: Video encoding settings
        max_session_duration:
          title: Max Session Duration
          description: >-
            Maximum session duration in seconds. Must be <= the configured limit
            for your subscription tier.
          type: integer
        livekit_config:
          anyOf:
            - $ref: '#/components/schemas/LiveKitConfigSchema'
            - type: 'null'
          description: LiveKit config. Allow users to override the livekit config
        agora_config:
          anyOf:
            - $ref: '#/components/schemas/AgoraConfigSchema'
            - type: 'null'
          description: Agora config. Allow users to use Agora as the transport layer
        elevenlabs_agent_config:
          anyOf:
            - $ref: '#/components/schemas/ElevenLabsAgentConfigSchema'
            - type: 'null'
          description: >-
            ElevenLabs Agent config. When set, uses ElevenLabs Agent instead of
            default.
        openai_realtime_config:
          anyOf:
            - $ref: '#/components/schemas/OpenAIRealtimeConfigSchema'
            - type: 'null'
          description: >-
            OpenAI Realtime config. When set, uses OpenAI Realtime API instead
            of default.
        gemini_realtime_config:
          anyOf:
            - $ref: '#/components/schemas/GeminiRealtimeConfigSchema'
            - type: 'null'
          description: >-
            Gemini Realtime config. When set, uses Gemini Live API instead of
            default.
      type: object
      required:
        - avatar_id
      title: Lite Mode
    Response_SDKSessionTokenSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/SDKSessionTokenSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[SDKSessionTokenSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    VideoSettings:
      properties:
        quality:
          $ref: '#/components/schemas/VideoQualityEnum'
          default: high
        encoding:
          $ref: '#/components/schemas/VideoEncodingEnum'
          default: H264
      type: object
      title: VideoSettings
      description: Video encoding settings for session configuration
    AvatarPersonaSchema:
      properties:
        voice_id:
          title: Voice Id
          description: Voice ID. If empty use default avatar voice
          type: string
          format: uuid
        context_id:
          title: Context Id
          description: Context ID
          type: string
          format: uuid
        language:
          type: string
          title: Language
          description: Language
          default: en
        voice_settings:
          anyOf:
            - oneOf:
                - $ref: '#/components/schemas/ElevenLabsVoiceSettings'
                - $ref: '#/components/schemas/FishAudioVoiceSettings'
              discriminator:
                propertyName: provider
                mapping:
                  elevenLabs:
                    $ref: '#/components/schemas/ElevenLabsVoiceSettings'
                  fish:
                    $ref: '#/components/schemas/FishAudioVoiceSettings'
            - type: 'null'
          title: Voice Settings
          description: >-
            Additional voice settings (provider-specific, discriminated by
            'provider' field)
        stt_config:
          anyOf:
            - $ref: '#/components/schemas/STTConfigSchema'
            - type: 'null'
          description: ASR/STT configuration override
      type: object
      title: AvatarPersonaSchema
    SessionInteractivityTypeEnum:
      type: string
      enum:
        - CONVERSATIONAL
        - PUSH_TO_TALK
      title: SessionInteractivityTypeEnum
    MemoryRef:
      properties:
        prev_session_id:
          title: Prev Session Id
          description: >-
            Seed memory from a prior FULL-mode session. Reused if a
            session-memory already exists for that session; otherwise
            sync-bootstrapped.
          type: string
          format: uuid
        session_memory_id:
          title: Session Memory Id
          description: >-
            Attach an existing session-typed memory by id (must belong to
            caller's space).
          type: string
          format: uuid
      type: object
      title: MemoryRef
      description: |-
        Session-memory attach request.

        Either field may be set. If both are set, they must resolve to the same
        memory_id; mismatch -> 400.
    LiveKitConfigSchema:
      properties:
        livekit_url:
          type: string
          title: Livekit Url
        livekit_room:
          type: string
          title: Livekit Room
        livekit_client_token:
          type: string
          title: Livekit Client Token
      type: object
      required:
        - livekit_url
        - livekit_room
        - livekit_client_token
      title: LiveKitConfigSchema
    AgoraConfigSchema:
      properties:
        agora_app_id:
          type: string
          title: Agora App Id
        agora_token:
          type: string
          title: Agora Token
        agora_channel:
          type: string
          title: Agora Channel
        agora_uid:
          type: string
          title: Agora Uid
      type: object
      required:
        - agora_app_id
        - agora_token
        - agora_channel
        - agora_uid
      title: AgoraConfigSchema
    ElevenLabsAgentConfigSchema:
      properties:
        secret_id:
          type: string
          format: uuid
          title: Secret Id
          description: Secret ID for ELEVENLABS_API_KEY
        agent_id:
          type: string
          title: Agent Id
          description: ElevenLabs Agent ID
        voice_id:
          title: Voice Id
          description: >-
            Optional ElevenLabs voice ID override. When set, sent to the
            ElevenLabs Agent WebSocket as
            `conversation_config_override.tts.voice_id`, overriding the agent's
            default voice for this session. When omitted, the agent's configured
            default voice is used. See
            https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket
          type: string
        dynamic_variables:
          title: Dynamic Variables
          description: >-
            ElevenLabs Agent dynamic variables injected into prompts and tools.
            See
            https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables
          additionalProperties:
            anyOf:
              - type: string
              - type: integer
              - type: number
              - type: boolean
          type: object
      type: object
      required:
        - secret_id
        - agent_id
      title: ElevenLabsAgentConfigSchema
      description: >-
        Config for ElevenLabs Agent mode in LITE sessions. All fields required
        when present.
    OpenAIRealtimeConfigSchema:
      properties:
        secret_id:
          type: string
          format: uuid
          title: Secret Id
          description: Secret ID referencing OPENAI_API_KEY secret
        context_id:
          title: Context Id
          description: Context ID.
          type: string
          format: uuid
        voice:
          $ref: '#/components/schemas/OpenAIRealtimeVoiceEnum'
          description: OpenAI Realtime voice
          default: alloy
        temperature:
          type: number
          maximum: 1.2
          minimum: 0.6
          title: Temperature
          description: Sampling temperature
          default: 0.8
        model:
          type: string
          title: Model
          description: OpenAI Realtime model
          default: gpt-realtime
      type: object
      required:
        - secret_id
      title: OpenAIRealtimeConfigSchema
      description: Config for OpenAI Realtime Agent mode in LITE sessions.
    GeminiRealtimeConfigSchema:
      properties:
        secret_id:
          type: string
          format: uuid
          title: Secret Id
          description: Secret ID referencing GEMINI_API_KEY secret
        context_id:
          title: Context Id
          description: Context ID.
          type: string
          format: uuid
        voice:
          $ref: '#/components/schemas/GeminiRealtimeVoiceEnum'
          description: Gemini Realtime voice
          default: Puck
        temperature:
          type: number
          maximum: 2
          minimum: 0
          title: Temperature
          description: Sampling temperature
          default: 0.8
        model:
          $ref: '#/components/schemas/GeminiRealtimeModelEnum'
          description: Gemini Realtime model
          default: gemini-3.1-flash-live-preview
      type: object
      required:
        - secret_id
      title: GeminiRealtimeConfigSchema
      description: Config for Gemini Realtime Agent mode in LITE sessions.
    SDKSessionTokenSchema:
      properties:
        session_id:
          type: string
          format: uuid
          title: Session Id
        session_token:
          type: string
          title: Session Token
      type: object
      required:
        - session_id
        - session_token
      title: SDKSessionTokenSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    VideoQualityEnum:
      type: string
      enum:
        - very_high
        - high
        - medium
        - low
      title: VideoQualityEnum
    VideoEncodingEnum:
      type: string
      enum:
        - VP8
        - H264
      title: VideoEncodingEnum
    ElevenLabsVoiceSettings:
      properties:
        provider:
          type: string
          const: elevenLabs
          title: Provider
          default: elevenLabs
        speed:
          type: number
          maximum: 1.2
          minimum: 0.8
          title: Speed
          default: 1
        stability:
          type: number
          maximum: 1
          minimum: 0
          title: Stability
          default: 0.75
        similarity_boost:
          type: number
          maximum: 1
          minimum: 0
          title: Similarity Boost
          default: 0.75
        style:
          type: number
          maximum: 1
          minimum: 0
          title: Style
          default: 0
        use_speaker_boost:
          type: boolean
          title: Use Speaker Boost
          default: true
        model:
          $ref: '#/components/schemas/ElevenLabsModelEnum'
          description: >-
            ElevenLabs TTS model. Options: 'eleven_flash_v2_5' (default, faster)
            or 'eleven_multilingual_v2' (better quality).
          default: eleven_flash_v2_5
        apply_language_text_normalization:
          type: boolean
          title: Apply Language Text Normalization
          description: >-
            Apply ElevenLabs language-specific text normalization. Improves
            pronunciation for languages with complex orthography — currently
            only Japanese ('ja') is supported. Enabling this adds latency, so it
            is opt-in and only valid when the session language is set to 'ja'.
          default: false
      type: object
      title: ElevenLabsVoiceSettings
      description: ElevenLabs-specific voice settings for TTS configuration.
    FishAudioVoiceSettings:
      properties:
        provider:
          type: string
          const: fish
          title: Provider
          default: fish
        speed:
          type: number
          maximum: 1.2
          minimum: 0.8
          title: Speed
          default: 1
        model:
          $ref: '#/components/schemas/FishAudioModelEnum'
          description: Fish Audio TTS model.
          default: s2
        latency_mode:
          type: string
          enum:
            - normal
            - balanced
          title: Latency Mode
          description: 'Latency mode: ''normal'' (~500ms) or ''balanced'' (~300ms).'
          default: balanced
      type: object
      title: FishAudioVoiceSettings
      description: Fish Audio-specific voice settings for TTS configuration.
    STTConfigSchema:
      properties:
        provider:
          $ref: '#/components/schemas/STTProviderEnum'
          description: STT provider. Auto-selected if not specified.
      type: object
      required:
        - provider
      title: STTConfigSchema
      description: User-provided STT configuration for sessions.
    OpenAIRealtimeVoiceEnum:
      type: string
      enum:
        - alloy
        - ash
        - ballad
        - coral
        - echo
        - fable
        - onyx
        - nova
        - shimmer
        - sage
        - verse
        - marin
        - cedar
      title: OpenAIRealtimeVoiceEnum
    GeminiRealtimeVoiceEnum:
      type: string
      enum:
        - Achernar
        - Achird
        - Algenib
        - Algieba
        - Alnilam
        - Aoede
        - Autonoe
        - Callirrhoe
        - Charon
        - Despina
        - Enceladus
        - Erinome
        - Fenrir
        - Gacrux
        - Iapetus
        - Kore
        - Laomedeia
        - Leda
        - Orus
        - Pulcherrima
        - Puck
        - Rasalgethi
        - Sadachbia
        - Sadaltager
        - Schedar
        - Sulafat
        - Umbriel
        - Vindemiatrix
        - Zephyr
        - Zubenelgenubi
      title: GeminiRealtimeVoiceEnum
    GeminiRealtimeModelEnum:
      type: string
      enum:
        - gemini-2.5-flash-native-audio-preview-12-2025
        - gemini-3.1-flash-live-preview
      title: GeminiRealtimeModelEnum
    ElevenLabsModelEnum:
      type: string
      enum:
        - eleven_flash_v2_5
        - eleven_multilingual_v2
      title: ElevenLabsModelEnum
    FishAudioModelEnum:
      type: string
      enum:
        - s1
        - s2
      title: FishAudioModelEnum
    STTProviderEnum:
      type: string
      enum:
        - deepgram
        - assembly_ai
        - gladia
        - elevenlabs
      title: STTProviderEnum
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY
    HTTPBearer:
      type: http
      scheme: bearer
      bearerFormat: JWT

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Start Session

> Start a new session



## OpenAPI

````yaml /openapi.json post /v1/sessions/start
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/sessions/start:
    post:
      tags:
        - Sessions
      summary: Start Session
      description: Start a new session
      operationId: start_session_v1_sessions_start_post
      responses:
        '201':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_StartSessionResponseSchema_'
      security:
        - HTTPBearer: []
components:
  schemas:
    Response_StartSessionResponseSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/StartSessionResponseSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[StartSessionResponseSchema]
    StartSessionResponseSchema:
      properties:
        session_id:
          type: string
          title: Session Id
        livekit_url:
          type: string
          title: Livekit Url
        livekit_client_token:
          type: string
          title: Livekit Client Token
        livekit_agent_token:
          title: Livekit Agent Token
          type: string
        max_session_duration:
          title: Max Session Duration
          type: integer
        ws_url:
          title: Ws Url
          description: Websocket URL to send session events to. Custom Mode only.
          type: string
      type: object
      required:
        - session_id
        - livekit_url
        - livekit_client_token
      title: StartSessionResponseSchema
  securitySchemes:
    HTTPBearer:
      type: http
      scheme: bearer
      bearerFormat: JWT

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Stop Session

> Stop a session



## OpenAPI

````yaml /openapi.json post /v1/sessions/stop
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/sessions/stop:
    post:
      tags:
        - Sessions
      summary: Stop Session
      description: Stop a session
      operationId: stop_session_v1_sessions_stop_post
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StopSessionSchema'
              default:
                reason: USER_CLOSED
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
        - HTTPBearer: []
components:
  schemas:
    StopSessionSchema:
      properties:
        session_id:
          type: string
          format: uuid
          title: Session Id
        reason:
          $ref: '#/components/schemas/SessionEndReasonEnum'
          default: UNKNOWN
      type: object
      title: StopSessionSchema
    Response:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          title: Data
        message:
          title: Message
          type: string
      type: object
      title: Response
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    SessionEndReasonEnum:
      type: string
      enum:
        - UNKNOWN
        - USER_DISCONNECTED
        - SERVER_ERROR
        - IDLE_TIMEOUT
        - NO_CREDITS
        - USER_CLOSED
        - AVATAR_DELETED
        - MAX_DURATION_REACHED
        - ZOMBIE_SESSION_REAP
        - AGENT_HANG_UP
      title: SessionEndReasonEnum
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY
    HTTPBearer:
      type: http
      scheme: bearer
      bearerFormat: JWT

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Keep Session Alive

> Keep the session alive



## OpenAPI

````yaml /openapi.json post /v1/sessions/keep-alive
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/sessions/keep-alive:
    post:
      tags:
        - Sessions
      summary: Keep Session Alive
      description: Keep the session alive
      operationId: keep_session_alive_v1_sessions_keep_alive_post
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/KeepSessionAliveSchema'
              default: {}
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
        - HTTPBearer: []
components:
  schemas:
    KeepSessionAliveSchema:
      properties:
        session_id:
          type: string
          format: uuid
          title: Session Id
      type: object
      title: KeepSessionAliveSchema
    Response:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          title: Data
        message:
          title: Message
          type: string
      type: object
      title: Response
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY
    HTTPBearer:
      type: http
      scheme: bearer
      bearerFormat: JWT

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List Sessions

> List active sessions for the authenticated user



## OpenAPI

````yaml /openapi.json get /v1/sessions
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/sessions:
    get:
      tags:
        - Sessions
      summary: List Sessions
      description: List active sessions for the authenticated user
      operationId: list_sessions_v1_sessions_get
      parameters:
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
            title: Page
        - name: page_size
          in: query
          required: false
          schema:
            type: integer
            maximum: 100
            minimum: 1
            default: 20
            title: Page Size
        - name: type
          in: query
          required: true
          schema:
            enum:
              - active
              - historic
            type: string
            title: Type
        - name: avatar_id
          in: query
          required: false
          schema:
            title: Avatar Id
            type: string
        - name: embed_id
          in: query
          required: false
          schema:
            title: Embed Id
            type: string
        - name: context_id
          in: query
          required: false
          schema:
            title: Context Id
            type: string
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/Response_PaginatedResponse_Union_ListSessionEntrySchema__ListHistoricEntrySchema___
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_PaginatedResponse_Union_ListSessionEntrySchema__ListHistoricEntrySchema___:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: >-
                #/components/schemas/PaginatedResponse_Union_ListSessionEntrySchema__ListHistoricEntrySchema__
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: >-
        Response[PaginatedResponse[Union[ListSessionEntrySchema,
        ListHistoricEntrySchema]]]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    PaginatedResponse_Union_ListSessionEntrySchema__ListHistoricEntrySchema__:
      properties:
        count:
          type: integer
          title: Count
        next:
          title: Next
          type: string
        previous:
          title: Previous
          type: string
        results:
          items:
            anyOf:
              - $ref: '#/components/schemas/ListSessionEntrySchema'
              - $ref: '#/components/schemas/ListHistoricEntrySchema'
          type: array
          title: Results
      type: object
      required:
        - count
        - results
      title: >-
        PaginatedResponse[Union[ListSessionEntrySchema,
        ListHistoricEntrySchema]]
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    ListSessionEntrySchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        duration:
          type: integer
          title: Duration
        source:
          $ref: '#/components/schemas/SessionSourceEnum'
        mode:
          $ref: '#/components/schemas/SessionModeEnum'
        is_sandbox:
          type: boolean
          title: Is Sandbox
        credits_consumed:
          type: number
          title: Credits Consumed
          description: Total credits consumed by this session
      type: object
      required:
        - id
        - created_at
        - updated_at
        - duration
        - source
        - mode
        - is_sandbox
        - credits_consumed
      title: ListSessionEntrySchema
    ListHistoricEntrySchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        duration:
          type: integer
          title: Duration
        source:
          $ref: '#/components/schemas/SessionSourceEnum'
        mode:
          $ref: '#/components/schemas/SessionModeEnum'
        is_sandbox:
          type: boolean
          title: Is Sandbox
        credits_consumed:
          type: number
          title: Credits Consumed
          description: Total credits consumed by this session
        end_at:
          title: End At
          type: string
          format: date-time
        end_reason:
          anyOf:
            - $ref: '#/components/schemas/SessionEndReasonEnum'
            - type: 'null'
      type: object
      required:
        - id
        - created_at
        - updated_at
        - duration
        - source
        - mode
        - is_sandbox
        - credits_consumed
      title: ListHistoricEntrySchema
    SessionSourceEnum:
      type: string
      enum:
        - DEMO
        - APP
        - API
        - EMBED
      title: SessionSourceEnum
    SessionModeEnum:
      type: string
      enum:
        - FULL
        - LITE
      title: SessionModeEnum
    SessionEndReasonEnum:
      type: string
      enum:
        - UNKNOWN
        - USER_DISCONNECTED
        - SERVER_ERROR
        - IDLE_TIMEOUT
        - NO_CREDITS
        - USER_CLOSED
        - AVATAR_DELETED
        - MAX_DURATION_REACHED
        - ZOMBIE_SESSION_REAP
        - AGENT_HANG_UP
      title: SessionEndReasonEnum
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Session

> Get a specific session by ID



## OpenAPI

````yaml /openapi.json get /v1/sessions/{session_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/sessions/{session_id}:
    get:
      tags:
        - Sessions
      summary: Get Session
      description: Get a specific session by ID
      operationId: get_session_v1_sessions__session_id__get
      parameters:
        - name: session_id
          in: path
          required: true
          schema:
            type: string
            title: Session Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/Response_Union_ListSessionEntrySchema__ListHistoricEntrySchema__
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_Union_ListSessionEntrySchema__ListHistoricEntrySchema__:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/ListSessionEntrySchema'
            - $ref: '#/components/schemas/ListHistoricEntrySchema'
            - type: 'null'
          title: Data
        message:
          title: Message
          type: string
      type: object
      title: Response[Union[ListSessionEntrySchema, ListHistoricEntrySchema]]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ListSessionEntrySchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        duration:
          type: integer
          title: Duration
        source:
          $ref: '#/components/schemas/SessionSourceEnum'
        mode:
          $ref: '#/components/schemas/SessionModeEnum'
        is_sandbox:
          type: boolean
          title: Is Sandbox
        credits_consumed:
          type: number
          title: Credits Consumed
          description: Total credits consumed by this session
      type: object
      required:
        - id
        - created_at
        - updated_at
        - duration
        - source
        - mode
        - is_sandbox
        - credits_consumed
      title: ListSessionEntrySchema
    ListHistoricEntrySchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        duration:
          type: integer
          title: Duration
        source:
          $ref: '#/components/schemas/SessionSourceEnum'
        mode:
          $ref: '#/components/schemas/SessionModeEnum'
        is_sandbox:
          type: boolean
          title: Is Sandbox
        credits_consumed:
          type: number
          title: Credits Consumed
          description: Total credits consumed by this session
        end_at:
          title: End At
          type: string
          format: date-time
        end_reason:
          anyOf:
            - $ref: '#/components/schemas/SessionEndReasonEnum'
            - type: 'null'
      type: object
      required:
        - id
        - created_at
        - updated_at
        - duration
        - source
        - mode
        - is_sandbox
        - credits_consumed
      title: ListHistoricEntrySchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    SessionSourceEnum:
      type: string
      enum:
        - DEMO
        - APP
        - API
        - EMBED
      title: SessionSourceEnum
    SessionModeEnum:
      type: string
      enum:
        - FULL
        - LITE
      title: SessionModeEnum
    SessionEndReasonEnum:
      type: string
      enum:
        - UNKNOWN
        - USER_DISCONNECTED
        - SERVER_ERROR
        - IDLE_TIMEOUT
        - NO_CREDITS
        - USER_CLOSED
        - AVATAR_DELETED
        - MAX_DURATION_REACHED
        - ZOMBIE_SESSION_REAP
        - AGENT_HANG_UP
      title: SessionEndReasonEnum
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Session Transcript

> Get the transcript for a session



## OpenAPI

````yaml /openapi.json get /v1/sessions/{session_id}/transcript
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/sessions/{session_id}/transcript:
    get:
      tags:
        - Sessions
      summary: Get Session Transcript
      description: Get the transcript for a session
      operationId: get_session_transcript_v1_sessions__session_id__transcript_get
      parameters:
        - name: session_id
          in: path
          required: true
          schema:
            type: string
            title: Session Id
        - name: start_timestamp
          in: query
          required: false
          schema:
            title: Start Timestamp
            type: integer
        - name: end_timestamp
          in: query
          required: false
          schema:
            title: End Timestamp
            type: integer
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_SessionTranscriptResponseSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_SessionTranscriptResponseSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/SessionTranscriptResponseSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[SessionTranscriptResponseSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    SessionTranscriptResponseSchema:
      properties:
        session_active:
          type: boolean
          title: Session Active
        next_timestamp:
          title: Next Timestamp
          type: integer
        transcript_data:
          items:
            $ref: '#/components/schemas/SessionTranscriptDataSchema'
          type: array
          title: Transcript Data
      type: object
      required:
        - session_active
        - transcript_data
      title: SessionTranscriptResponseSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    SessionTranscriptDataSchema:
      properties:
        role:
          type: string
          enum:
            - user
            - avatar
          title: Role
        transcript:
          type: string
          title: Transcript
        absolute_timestamp:
          type: integer
          title: Absolute Timestamp
        relative_timestamp:
          type: integer
          title: Relative Timestamp
      type: object
      required:
        - role
        - transcript
        - absolute_timestamp
        - relative_timestamp
      title: SessionTranscriptDataSchema
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Delete Session Events

> Hard delete all session events for a given session



## OpenAPI

````yaml /openapi.json delete /v1/sessions/{session_id}/events
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/sessions/{session_id}/events:
    delete:
      tags:
        - Sessions
      summary: Delete Session Events
      description: Hard delete all session events for a given session
      operationId: delete_session_events_v1_sessions__session_id__events_delete
      parameters:
        - name: session_id
          in: path
          required: true
          schema:
            type: string
            title: Session Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          title: Data
        message:
          title: Message
          type: string
      type: object
      title: Response
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List User Avatars

> Get avatars list for auth user



## OpenAPI

````yaml /openapi.json get /v1/avatars
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/avatars:
    get:
      tags:
        - Avatar
      summary: List User Avatars
      description: Get avatars list for auth user
      operationId: list_user_avatars_v1_avatars_get
      parameters:
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
            title: Page
        - name: page_size
          in: query
          required: false
          schema:
            type: integer
            maximum: 100
            minimum: 1
            default: 20
            title: Page Size
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_PaginatedResponse_AvatarSchema__'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_PaginatedResponse_AvatarSchema__:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/PaginatedResponse_AvatarSchema_'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[PaginatedResponse[AvatarSchema]]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    PaginatedResponse_AvatarSchema_:
      properties:
        count:
          type: integer
          title: Count
        next:
          title: Next
          type: string
        previous:
          title: Previous
          type: string
        results:
          items:
            $ref: '#/components/schemas/AvatarSchema'
          type: array
          title: Results
      type: object
      required:
        - count
        - results
      title: PaginatedResponse[AvatarSchema]
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    AvatarSchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        space_id:
          title: Space Id
          type: string
        type:
          $ref: '#/components/schemas/AvatarTypeEnum'
          default: VIDEO
        status:
          $ref: '#/components/schemas/AvatarStatusEnum'
          default: INIT
        name:
          type: string
          title: Name
        preview_url:
          title: Preview Url
          type: string
        is_expired:
          type: boolean
          title: Is Expired
          default: false
        default_voice:
          anyOf:
            - $ref: '#/components/schemas/DefaultAvatarVoice'
            - type: 'null'
        is_1080p:
          type: boolean
          title: Is 1080P
          default: false
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        error_message:
          title: Error Message
          description: >-
            Error message if training failed (prefer detailed, fallback to
            short).
          readOnly: true
          type: string
      type: object
      required:
        - id
        - name
        - created_at
        - updated_at
        - error_message
      title: AvatarSchema
    AvatarTypeEnum:
      type: string
      enum:
        - IMAGE
        - VIDEO
      title: AvatarTypeEnum
    AvatarStatusEnum:
      type: string
      enum:
        - ACTIVE
        - INIT
        - DEPLOYING
        - FAILED
      title: AvatarStatusEnum
    DefaultAvatarVoice:
      properties:
        id:
          type: string
          title: Id
        name:
          type: string
          title: Name
      type: object
      required:
        - id
        - name
      title: DefaultAvatarVoice
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List Public Avatars

> Get public avatars list



## OpenAPI

````yaml /openapi.json get /v1/avatars/public
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/avatars/public:
    get:
      tags:
        - Avatar
      summary: List Public Avatars
      description: Get public avatars list
      operationId: list_public_avatars_v1_avatars_public_get
      parameters:
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
            title: Page
        - name: page_size
          in: query
          required: false
          schema:
            type: integer
            maximum: 100
            minimum: 1
            default: 20
            title: Page Size
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_PaginatedResponse_AvatarSchema__'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
components:
  schemas:
    Response_PaginatedResponse_AvatarSchema__:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/PaginatedResponse_AvatarSchema_'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[PaginatedResponse[AvatarSchema]]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    PaginatedResponse_AvatarSchema_:
      properties:
        count:
          type: integer
          title: Count
        next:
          title: Next
          type: string
        previous:
          title: Previous
          type: string
        results:
          items:
            $ref: '#/components/schemas/AvatarSchema'
          type: array
          title: Results
      type: object
      required:
        - count
        - results
      title: PaginatedResponse[AvatarSchema]
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    AvatarSchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        space_id:
          title: Space Id
          type: string
        type:
          $ref: '#/components/schemas/AvatarTypeEnum'
          default: VIDEO
        status:
          $ref: '#/components/schemas/AvatarStatusEnum'
          default: INIT
        name:
          type: string
          title: Name
        preview_url:
          title: Preview Url
          type: string
        is_expired:
          type: boolean
          title: Is Expired
          default: false
        default_voice:
          anyOf:
            - $ref: '#/components/schemas/DefaultAvatarVoice'
            - type: 'null'
        is_1080p:
          type: boolean
          title: Is 1080P
          default: false
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        error_message:
          title: Error Message
          description: >-
            Error message if training failed (prefer detailed, fallback to
            short).
          readOnly: true
          type: string
      type: object
      required:
        - id
        - name
        - created_at
        - updated_at
        - error_message
      title: AvatarSchema
    AvatarTypeEnum:
      type: string
      enum:
        - IMAGE
        - VIDEO
      title: AvatarTypeEnum
    AvatarStatusEnum:
      type: string
      enum:
        - ACTIVE
        - INIT
        - DEPLOYING
        - FAILED
      title: AvatarStatusEnum
    DefaultAvatarVoice:
      properties:
        id:
          type: string
          title: Id
        name:
          type: string
          title: Name
      type: object
      required:
        - id
        - name
      title: DefaultAvatarVoice

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Avatar By Id

> Get avatar by id



## OpenAPI

````yaml /openapi.json get /v1/avatars/{avatar_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/avatars/{avatar_id}:
    get:
      tags:
        - Avatar
      summary: Get Avatar By Id
      description: Get avatar by id
      operationId: get_avatar_by_id_v1_avatars__avatar_id__get
      parameters:
        - name: avatar_id
          in: path
          required: true
          schema:
            title: Avatar Id
            type: string
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_AvatarSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_AvatarSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/AvatarSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[AvatarSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    AvatarSchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        space_id:
          title: Space Id
          type: string
        type:
          $ref: '#/components/schemas/AvatarTypeEnum'
          default: VIDEO
        status:
          $ref: '#/components/schemas/AvatarStatusEnum'
          default: INIT
        name:
          type: string
          title: Name
        preview_url:
          title: Preview Url
          type: string
        is_expired:
          type: boolean
          title: Is Expired
          default: false
        default_voice:
          anyOf:
            - $ref: '#/components/schemas/DefaultAvatarVoice'
            - type: 'null'
        is_1080p:
          type: boolean
          title: Is 1080P
          default: false
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        error_message:
          title: Error Message
          description: >-
            Error message if training failed (prefer detailed, fallback to
            short).
          readOnly: true
          type: string
      type: object
      required:
        - id
        - name
        - created_at
        - updated_at
        - error_message
      title: AvatarSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    AvatarTypeEnum:
      type: string
      enum:
        - IMAGE
        - VIDEO
      title: AvatarTypeEnum
    AvatarStatusEnum:
      type: string
      enum:
        - ACTIVE
        - INIT
        - DEPLOYING
        - FAILED
      title: AvatarStatusEnum
    DefaultAvatarVoice:
      properties:
        id:
          type: string
          title: Id
        name:
          type: string
          title: Name
      type: object
      required:
        - id
        - name
      title: DefaultAvatarVoice
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Delete Avatar

> Soft delete avatar



## OpenAPI

````yaml /openapi.json delete /v1/avatars/{avatar_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/avatars/{avatar_id}:
    delete:
      tags:
        - Avatar
      summary: Delete Avatar
      description: Soft delete avatar
      operationId: delete_avatar_v1_avatars__avatar_id__delete
      parameters:
        - name: avatar_id
          in: path
          required: true
          schema:
            title: Avatar Id
            type: string
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          title: Data
        message:
          title: Message
          type: string
      type: object
      title: Response
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Update Avatar

> Update avatar



## OpenAPI

````yaml /openapi.json patch /v1/avatars/{avatar_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/avatars/{avatar_id}:
    patch:
      tags:
        - Avatar
      summary: Update Avatar
      description: Update avatar
      operationId: update_avatar_v1_avatars__avatar_id__patch
      parameters:
        - name: avatar_id
          in: path
          required: true
          schema:
            title: Avatar Id
            type: string
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateAvatarSchema'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_AvatarSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    UpdateAvatarSchema:
      properties:
        name:
          type: string
          title: Name
        default_voice_id:
          title: Default Voice Id
          type: string
      type: object
      title: UpdateAvatarSchema
    Response_AvatarSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/AvatarSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[AvatarSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    AvatarSchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        space_id:
          title: Space Id
          type: string
        type:
          $ref: '#/components/schemas/AvatarTypeEnum'
          default: VIDEO
        status:
          $ref: '#/components/schemas/AvatarStatusEnum'
          default: INIT
        name:
          type: string
          title: Name
        preview_url:
          title: Preview Url
          type: string
        is_expired:
          type: boolean
          title: Is Expired
          default: false
        default_voice:
          anyOf:
            - $ref: '#/components/schemas/DefaultAvatarVoice'
            - type: 'null'
        is_1080p:
          type: boolean
          title: Is 1080P
          default: false
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        error_message:
          title: Error Message
          description: >-
            Error message if training failed (prefer detailed, fallback to
            short).
          readOnly: true
          type: string
      type: object
      required:
        - id
        - name
        - created_at
        - updated_at
        - error_message
      title: AvatarSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    AvatarTypeEnum:
      type: string
      enum:
        - IMAGE
        - VIDEO
      title: AvatarTypeEnum
    AvatarStatusEnum:
      type: string
      enum:
        - ACTIVE
        - INIT
        - DEPLOYING
        - FAILED
      title: AvatarStatusEnum
    DefaultAvatarVoice:
      properties:
        id:
          type: string
          title: Id
        name:
          type: string
          title: Name
      type: object
      required:
        - id
        - name
      title: DefaultAvatarVoice
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List Voices

> Get voices list



## OpenAPI

````yaml /openapi.json get /v1/voices
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/voices:
    get:
      tags:
        - Voices
      summary: List Voices
      description: Get voices list
      operationId: list_voices_v1_voices_get
      parameters:
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
            title: Page
        - name: page_size
          in: query
          required: false
          schema:
            type: integer
            maximum: 100
            minimum: 1
            default: 20
            title: Page Size
        - name: voice_type
          in: query
          required: false
          schema:
            $ref: '#/components/schemas/VoiceListTypeEnum'
            default: public
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_PaginatedResponse_VoiceSchema__'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    VoiceListTypeEnum:
      type: string
      enum:
        - public
        - private
      title: VoiceListTypeEnum
    Response_PaginatedResponse_VoiceSchema__:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/PaginatedResponse_VoiceSchema_'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[PaginatedResponse[VoiceSchema]]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    PaginatedResponse_VoiceSchema_:
      properties:
        count:
          type: integer
          title: Count
        next:
          title: Next
          type: string
        previous:
          title: Previous
          type: string
        results:
          items:
            $ref: '#/components/schemas/VoiceSchema'
          type: array
          title: Results
      type: object
      required:
        - count
        - results
      title: PaginatedResponse[VoiceSchema]
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    VoiceSchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        name:
          type: string
          title: Name
        description:
          title: Description
          type: string
        language:
          type: string
          title: Language
        gender:
          type: string
          title: Gender
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        tags:
          items:
            type: string
          type: array
          title: Tags
          readOnly: true
      type: object
      required:
        - id
        - name
        - language
        - gender
        - created_at
        - updated_at
        - tags
      title: VoiceSchema
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Bind Third Party Voice

> Bind a third-party voice (e.g. ElevenLabs) using a stored secret.

Validates the secret can be used to bind a third-party voice
and creates a voice record.
Returns a voice_id usable in sessions.



## OpenAPI

````yaml /openapi.json post /v1/voices/third_party
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/voices/third_party:
    post:
      tags:
        - Voices
      summary: Bind Third Party Voice
      description: |-
        Bind a third-party voice (e.g. ElevenLabs) using a stored secret.

        Validates the secret can be used to bind a third-party voice
        and creates a voice record.
        Returns a voice_id usable in sessions.
      operationId: bind_third_party_voice_v1_voices_third_party_post
      parameters:
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ThirdPartyVoiceBindRequestSchema'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/Response_ThirdPartyVoiceBindResponseSchema_
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    ThirdPartyVoiceBindRequestSchema:
      properties:
        provider_voice_id:
          type: string
          title: Provider Voice Id
          description: Voice ID from the provider (e.g. ElevenLabs voice ID)
        secret_id:
          type: string
          title: Secret Id
          description: ID of the space secret containing the provider API key
        name:
          title: Name
          description: Name of the voice
          type: string
      type: object
      required:
        - provider_voice_id
        - secret_id
      title: ThirdPartyVoiceBindRequestSchema
      description: >-
        Request body for POST /v1/voices/third_party - bind a third-party voice
        using a secret.
    Response_ThirdPartyVoiceBindResponseSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/ThirdPartyVoiceBindResponseSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[ThirdPartyVoiceBindResponseSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ThirdPartyVoiceBindResponseSchema:
      properties:
        voice_id:
          type: string
          title: Voice Id
          description: Voice ID saved on LiveAvatar side
      type: object
      required:
        - voice_id
      title: ThirdPartyVoiceBindResponseSchema
      description: Response from POST /v1/voices/third_party.
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Voice By Id

> Get voice by id



## OpenAPI

````yaml /openapi.json get /v1/voices/{voice_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/voices/{voice_id}:
    get:
      tags:
        - Voices
      summary: Get Voice By Id
      description: Get voice by id
      operationId: get_voice_by_id_v1_voices__voice_id__get
      parameters:
        - name: voice_id
          in: path
          required: true
          schema:
            type: string
            title: Voice Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_VoiceSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_VoiceSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/VoiceSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[VoiceSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    VoiceSchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        name:
          type: string
          title: Name
        description:
          title: Description
          type: string
        language:
          type: string
          title: Language
        gender:
          type: string
          title: Gender
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        tags:
          items:
            type: string
          type: array
          title: Tags
          readOnly: true
      type: object
      required:
        - id
        - name
        - language
        - gender
        - created_at
        - updated_at
        - tags
      title: VoiceSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Delete Voice

> Delete voice by id



## OpenAPI

````yaml /openapi.json delete /v1/voices/{voice_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/voices/{voice_id}:
    delete:
      tags:
        - Voices
      summary: Delete Voice
      description: Delete voice by id
      operationId: delete_voice_v1_voices__voice_id__delete
      parameters:
        - name: voice_id
          in: path
          required: true
          schema:
            type: string
            title: Voice Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_NoneType_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_NoneType_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          type: 'null'
          title: Data
        message:
          title: Message
          type: string
      type: object
      title: Response[NoneType]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Update Voice

> Update voice



## OpenAPI

````yaml /openapi.json patch /v1/voices/{voice_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/voices/{voice_id}:
    patch:
      tags:
        - Voices
      summary: Update Voice
      description: Update voice
      operationId: update_voice_v1_voices__voice_id__patch
      parameters:
        - name: voice_id
          in: path
          required: true
          schema:
            type: string
            title: Voice Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateVoiceSchema'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_VoiceSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    UpdateVoiceSchema:
      properties:
        name:
          type: string
          maxLength: 64
          minLength: 1
          title: Name
      type: object
      required:
        - name
      title: UpdateVoiceSchema
    Response_VoiceSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/VoiceSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[VoiceSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    VoiceSchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        name:
          type: string
          title: Name
        description:
          title: Description
          type: string
        language:
          type: string
          title: Language
        gender:
          type: string
          title: Gender
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        tags:
          items:
            type: string
          type: array
          title: Tags
          readOnly: true
      type: object
      required:
        - id
        - name
        - language
        - gender
        - created_at
        - updated_at
        - tags
      title: VoiceSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Voice Preview By Id

> Get voice preview by id



## OpenAPI

````yaml /openapi.json get /v1/voices/{voice_id}/preview
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/voices/{voice_id}/preview:
    get:
      tags:
        - Voices
      summary: Get Voice Preview By Id
      description: Get voice preview by id
      operationId: get_voice_preview_by_id_v1_voices__voice_id__preview_get
      parameters:
        - name: voice_id
          in: path
          required: true
          schema:
            type: string
            title: Voice Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_VoicePreviewResponseSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_VoicePreviewResponseSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/VoicePreviewResponseSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[VoicePreviewResponseSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    VoicePreviewResponseSchema:
      properties:
        audio_base64:
          type: string
          title: Audio Base64
      type: object
      required:
        - audio_base64
      title: VoicePreviewResponseSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List User Contexts

> List user contexts



## OpenAPI

````yaml /openapi.json get /v1/contexts
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/contexts:
    get:
      tags:
        - Contexts
      summary: List User Contexts
      description: List user contexts
      operationId: list_user_contexts_v1_contexts_get
      parameters:
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
            title: Page
        - name: page_size
          in: query
          required: false
          schema:
            type: integer
            maximum: 100
            minimum: 1
            default: 20
            title: Page Size
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/Response_PaginatedResponse_ContextSchema__
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_PaginatedResponse_ContextSchema__:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/PaginatedResponse_ContextSchema_'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[PaginatedResponse[ContextSchema]]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    PaginatedResponse_ContextSchema_:
      properties:
        count:
          type: integer
          title: Count
        next:
          title: Next
          type: string
        previous:
          title: Previous
          type: string
        results:
          items:
            $ref: '#/components/schemas/ContextSchema'
          type: array
          title: Results
      type: object
      required:
        - count
        - results
      title: PaginatedResponse[ContextSchema]
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    ContextSchema:
      properties:
        id:
          type: string
          format: uuid
          title: Id
        name:
          type: string
          title: Name
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
      type: object
      required:
        - id
        - name
        - created_at
        - updated_at
      title: ContextSchema
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Context

> Create a new user context record



## OpenAPI

````yaml /openapi.json post /v1/contexts
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/contexts:
    post:
      tags:
        - Contexts
      summary: Create Context
      description: Create a new user context record
      operationId: create_context_v1_contexts_post
      parameters:
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateContextSchema'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_ContextDetailSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    CreateContextSchema:
      properties:
        name:
          type: string
          title: Name
        prompt:
          type: string
          title: Prompt
        opening_text:
          title: Opening Text
          type: string
        links:
          title: Links
          items:
            $ref: '#/components/schemas/CreateUpdateContextLinkSchema'
          type: array
      type: object
      required:
        - name
        - prompt
        - opening_text
      title: CreateContextSchema
    Response_ContextDetailSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/ContextDetailSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[ContextDetailSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    CreateUpdateContextLinkSchema:
      properties:
        url:
          type: string
          title: Url
        faq:
          title: Faq
          type: string
        id:
          type: string
          format: uuid
          title: Id
      type: object
      required:
        - url
        - faq
      title: CreateUpdateContextLinkSchema
    ContextDetailSchema:
      properties:
        name:
          type: string
          title: Name
        prompt:
          type: string
          title: Prompt
        opening_text:
          title: Opening Text
          type: string
        id:
          type: string
          format: uuid
          title: Id
        links:
          title: Links
          items:
            $ref: '#/components/schemas/ContextLinkSchema'
          type: array
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        required_dynamic_variables:
          items:
            type: string
          type: array
          title: Required Dynamic Variables
          readOnly: true
      type: object
      required:
        - name
        - prompt
        - opening_text
        - id
        - created_at
        - updated_at
        - required_dynamic_variables
      title: ContextDetailSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    ContextLinkSchema:
      properties:
        url:
          type: string
          title: Url
        faq:
          title: Faq
          type: string
        id:
          type: string
          format: uuid
          title: Id
      type: object
      required:
        - url
        - faq
        - id
      title: ContextLinkSchema
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Context By Id

> Get a user context by id



## OpenAPI

````yaml /openapi.json get /v1/contexts/{context_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/contexts/{context_id}:
    get:
      tags:
        - Contexts
      summary: Get Context By Id
      description: Get a user context by id
      operationId: get_context_by_id_v1_contexts__context_id__get
      parameters:
        - name: context_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
            title: Context Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_ContextDetailSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_ContextDetailSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/ContextDetailSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[ContextDetailSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ContextDetailSchema:
      properties:
        name:
          type: string
          title: Name
        prompt:
          type: string
          title: Prompt
        opening_text:
          title: Opening Text
          type: string
        id:
          type: string
          format: uuid
          title: Id
        links:
          title: Links
          items:
            $ref: '#/components/schemas/ContextLinkSchema'
          type: array
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        required_dynamic_variables:
          items:
            type: string
          type: array
          title: Required Dynamic Variables
          readOnly: true
      type: object
      required:
        - name
        - prompt
        - opening_text
        - id
        - created_at
        - updated_at
        - required_dynamic_variables
      title: ContextDetailSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    ContextLinkSchema:
      properties:
        url:
          type: string
          title: Url
        faq:
          title: Faq
          type: string
        id:
          type: string
          format: uuid
          title: Id
      type: object
      required:
        - url
        - faq
        - id
      title: ContextLinkSchema
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Delete Context

> Delete a user context



## OpenAPI

````yaml /openapi.json delete /v1/contexts/{context_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/contexts/{context_id}:
    delete:
      tags:
        - Contexts
      summary: Delete Context
      description: Delete a user context
      operationId: delete_context_v1_contexts__context_id__delete
      parameters:
        - name: context_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
            title: Context Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          title: Data
        message:
          title: Message
          type: string
      type: object
      title: Response
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Update Context

> Update a user context



## OpenAPI

````yaml /openapi.json patch /v1/contexts/{context_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/contexts/{context_id}:
    patch:
      tags:
        - Contexts
      summary: Update Context
      description: Update a user context
      operationId: update_context_v1_contexts__context_id__patch
      parameters:
        - name: context_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
            title: Context Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateContextSchema'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_ContextDetailSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    UpdateContextSchema:
      properties:
        name:
          type: string
          title: Name
        prompt:
          type: string
          title: Prompt
        opening_text:
          title: Opening Text
          type: string
        links:
          title: Links
          items:
            $ref: '#/components/schemas/CreateUpdateContextLinkSchema'
          type: array
      type: object
      required:
        - name
        - prompt
        - opening_text
      title: UpdateContextSchema
    Response_ContextDetailSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/ContextDetailSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[ContextDetailSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    CreateUpdateContextLinkSchema:
      properties:
        url:
          type: string
          title: Url
        faq:
          title: Faq
          type: string
        id:
          type: string
          format: uuid
          title: Id
      type: object
      required:
        - url
        - faq
      title: CreateUpdateContextLinkSchema
    ContextDetailSchema:
      properties:
        name:
          type: string
          title: Name
        prompt:
          type: string
          title: Prompt
        opening_text:
          title: Opening Text
          type: string
        id:
          type: string
          format: uuid
          title: Id
        links:
          title: Links
          items:
            $ref: '#/components/schemas/ContextLinkSchema'
          type: array
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
        required_dynamic_variables:
          items:
            type: string
          type: array
          title: Required Dynamic Variables
          readOnly: true
      type: object
      required:
        - name
        - prompt
        - opening_text
        - id
        - created_at
        - updated_at
        - required_dynamic_variables
      title: ContextDetailSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    ContextLinkSchema:
      properties:
        url:
          type: string
          title: Url
        faq:
          title: Faq
          type: string
        id:
          type: string
          format: uuid
          title: Id
      type: object
      required:
        - url
        - faq
        - id
      title: ContextLinkSchema
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List Memories



## OpenAPI

````yaml /openapi.json get /v1/memory
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/memory:
    get:
      tags:
        - Memory
      summary: List Memories
      operationId: list_memories_v1_memory_get
      parameters:
        - name: type
          in: query
          required: false
          schema:
            anyOf:
              - $ref: '#/components/schemas/MemoryTypeEnum'
              - type: 'null'
            title: Type
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
            title: Page
        - name: page_size
          in: query
          required: false
          schema:
            type: integer
            maximum: 100
            minimum: 1
            default: 20
            title: Page Size
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/Response_PaginatedResponse_MemoryListItemResponse__
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    MemoryTypeEnum:
      type: string
      enum:
        - session
      title: MemoryTypeEnum
    Response_PaginatedResponse_MemoryListItemResponse__:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/PaginatedResponse_MemoryListItemResponse_'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[PaginatedResponse[MemoryListItemResponse]]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    PaginatedResponse_MemoryListItemResponse_:
      properties:
        count:
          type: integer
          title: Count
        next:
          title: Next
          type: string
        previous:
          title: Previous
          type: string
        results:
          items:
            $ref: '#/components/schemas/MemoryListItemResponse'
          type: array
          title: Results
      type: object
      required:
        - count
        - results
      title: PaginatedResponse[MemoryListItemResponse]
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    MemoryListItemResponse:
      properties:
        id:
          type: string
          title: Id
        memory_type:
          $ref: '#/components/schemas/MemoryTypeEnum'
        memory_content_preview:
          title: Memory Content Preview
          type: string
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
      type: object
      required:
        - id
        - memory_type
        - memory_content_preview
        - created_at
        - updated_at
      title: MemoryListItemResponse
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Memory



## OpenAPI

````yaml /openapi.json post /v1/memory
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/memory:
    post:
      tags:
        - Memory
      summary: Create Memory
      operationId: create_memory_v1_memory_post
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateSessionMemory'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_MemoryResponse_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    CreateSessionMemory:
      properties:
        memory_type:
          $ref: '#/components/schemas/MemoryTypeEnum'
        session_id:
          type: string
          format: uuid
          title: Session Id
      type: object
      required:
        - memory_type
        - session_id
      title: CreateSessionMemory
    Response_MemoryResponse_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/MemoryResponse'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[MemoryResponse]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    MemoryTypeEnum:
      type: string
      enum:
        - session
      title: MemoryTypeEnum
    MemoryResponse:
      properties:
        id:
          type: string
          title: Id
        memory_type:
          $ref: '#/components/schemas/MemoryTypeEnum'
        memory_content:
          title: Memory Content
          type: string
        created_at:
          type: string
          format: date-time
          title: Created At
      type: object
      required:
        - id
        - memory_type
        - memory_content
        - created_at
      title: MemoryResponse
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Memory



## OpenAPI

````yaml /openapi.json get /v1/memory/{memory_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/memory/{memory_id}:
    get:
      tags:
        - Memory
      summary: Get Memory
      operationId: get_memory_v1_memory__memory_id__get
      parameters:
        - name: memory_id
          in: path
          required: true
          schema:
            type: string
            title: Memory Id
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_MemoryWithEpisodesResponse_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_MemoryWithEpisodesResponse_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/MemoryWithEpisodesResponse'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[MemoryWithEpisodesResponse]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    MemoryWithEpisodesResponse:
      properties:
        id:
          type: string
          title: Id
        memory_type:
          $ref: '#/components/schemas/MemoryTypeEnum'
        memory_content:
          title: Memory Content
          type: string
        session_episodes:
          items:
            $ref: '#/components/schemas/MemoryEpisodeSchema'
          type: array
          title: Session Episodes
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
      type: object
      required:
        - id
        - memory_type
        - memory_content
        - session_episodes
        - created_at
        - updated_at
      title: MemoryWithEpisodesResponse
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    MemoryTypeEnum:
      type: string
      enum:
        - session
      title: MemoryTypeEnum
    MemoryEpisodeSchema:
      properties:
        session_id:
          type: string
          title: Session Id
        sequence_num:
          type: integer
          title: Sequence Num
        summary:
          type: string
          title: Summary
        created_at:
          type: string
          format: date-time
          title: Created At
      type: object
      required:
        - session_id
        - sequence_num
        - summary
        - created_at
      title: MemoryEpisodeSchema
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Delete Memory



## OpenAPI

````yaml /openapi.json delete /v1/memory/{memory_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/memory/{memory_id}:
    delete:
      tags:
        - Memory
      summary: Delete Memory
      operationId: delete_memory_v1_memory__memory_id__delete
      parameters:
        - name: memory_id
          in: path
          required: true
          schema:
            type: string
            title: Memory Id
      responses:
        '204':
          description: Successful Response
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List Secrets

> List all secrets for the authenticated user's space.

This endpoint:
- Requires API key authentication
- Returns metadata only (id, name, type) - never returns decrypted values
- Results are ordered by creation date (newest first)

Args:
    service: Injected secrets service

Returns:
    Response with list of secret metadata

Raises:
    400 Bad Request: If user doesn't have an associated space



## OpenAPI

````yaml /openapi.json get /v1/secrets
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/secrets:
    get:
      tags:
        - Secrets
      summary: List Secrets
      description: >-
        List all secrets for the authenticated user's space.


        This endpoint:

        - Requires API key authentication

        - Returns metadata only (id, name, type) - never returns decrypted
        values

        - Results are ordered by creation date (newest first)


        Args:
            service: Injected secrets service

        Returns:
            Response with list of secret metadata

        Raises:
            400 Bad Request: If user doesn't have an associated space
      operationId: list_secrets_v1_secrets_get
      parameters:
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_list_SecretListItemSchema__'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_list_SecretListItemSchema__:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          title: Data
          items:
            $ref: '#/components/schemas/SecretListItemSchema'
          type: array
        message:
          title: Message
          type: string
      type: object
      title: Response[list[SecretListItemSchema]]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    SecretListItemSchema:
      properties:
        id:
          type: string
          title: Id
        secret_name:
          type: string
          title: Secret Name
        secret_type:
          $ref: '#/components/schemas/SecretTypeEnum'
        created_at:
          type: string
          format: date-time
          title: Created At
      type: object
      required:
        - id
        - secret_name
        - secret_type
      title: SecretListItemSchema
      description: Schema for a secret item in list response (no decrypted value)
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
    SecretTypeEnum:
      type: string
      enum:
        - OPENAI_API_KEY
        - ELEVENLABS_API_KEY
        - GEMINI_API_KEY
      title: SecretTypeEnum
      description: The type of secret.
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Secret

> Create a new encrypted secret for the authenticated user's space.

This endpoint:
- Requires API key authentication
- Encrypts the secret value using AWS KMS
- Stores the encrypted value in the database
- Returns metadata about the created secret (including id for future reference)

Args:
    service: Injected secrets service
    payload: Request containing secret_name and secret_value

Returns:
    Response with created secret metadata including id

Raises:
    400 Bad Request: If user doesn't have an associated space
    500 Internal Server Error: If encryption or storage fails



## OpenAPI

````yaml /openapi.json post /v1/secrets
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/secrets:
    post:
      tags:
        - Secrets
      summary: Create Secret
      description: >-
        Create a new encrypted secret for the authenticated user's space.


        This endpoint:

        - Requires API key authentication

        - Encrypts the secret value using AWS KMS

        - Stores the encrypted value in the database

        - Returns metadata about the created secret (including id for future
        reference)


        Args:
            service: Injected secrets service
            payload: Request containing secret_name and secret_value

        Returns:
            Response with created secret metadata including id

        Raises:
            400 Bad Request: If user doesn't have an associated space
            500 Internal Server Error: If encryption or storage fails
      operationId: create_secret_v1_secrets_post
      parameters:
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateSecretRequestSchema'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_CreateSecretResponseSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    CreateSecretRequestSchema:
      properties:
        secret_name:
          type: string
          maxLength: 255
          minLength: 1
          title: Secret Name
          description: Name of the secret
        secret_value:
          type: string
          minLength: 1
          title: Secret Value
          description: The secret value to encrypt and store
        secret_type:
          $ref: '#/components/schemas/SecretTypeEnum'
          description: The type of secret
      type: object
      required:
        - secret_name
        - secret_value
        - secret_type
      title: CreateSecretRequestSchema
      description: Request schema for creating a new secret
    Response_CreateSecretResponseSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/CreateSecretResponseSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[CreateSecretResponseSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    SecretTypeEnum:
      type: string
      enum:
        - OPENAI_API_KEY
        - ELEVENLABS_API_KEY
        - GEMINI_API_KEY
      title: SecretTypeEnum
      description: The type of secret.
    CreateSecretResponseSchema:
      properties:
        id:
          type: string
          title: Id
        secret_name:
          type: string
          title: Secret Name
      type: object
      required:
        - id
        - secret_name
      title: CreateSecretResponseSchema
      description: Response schema after creating a secret
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Delete Secret

> Delete a secret by id.

This endpoint:
- Requires API key authentication
- Permanently deletes the encrypted secret from the database

Args:
    service: Injected secrets service
    secret_id: The id of the secret to delete

Returns:
    Response confirming deletion

Raises:
    400 Bad Request: If user doesn't have an associated space
    404 Not Found: If the secret doesn't exist



## OpenAPI

````yaml /openapi.json delete /v1/secrets/{secret_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/secrets/{secret_id}:
    delete:
      tags:
        - Secrets
      summary: Delete Secret
      description: |-
        Delete a secret by id.

        This endpoint:
        - Requires API key authentication
        - Permanently deletes the encrypted secret from the database

        Args:
            service: Injected secrets service
            secret_id: The id of the secret to delete

        Returns:
            Response confirming deletion

        Raises:
            400 Bad Request: If user doesn't have an associated space
            404 Not Found: If the secret doesn't exist
      operationId: delete_secret_v1_secrets__secret_id__delete
      parameters:
        - name: secret_id
          in: path
          required: true
          schema:
            type: string
            title: Secret Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_NoneType_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_NoneType_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          type: 'null'
          title: Data
        message:
          title: Message
          type: string
      type: object
      title: Response[NoneType]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List Llm Configurations

> List all LLM configurations for the authenticated user's space.

This endpoint:
- Requires API key or session authentication
- Returns all LLM configurations for the user's space
- Results are ordered by creation date (newest first)

Args:
    service: Injected LLM configuration service

Returns:
    Response with list of LLM configurations

Raises:
    400 Bad Request: If user doesn't have an associated space



## OpenAPI

````yaml /openapi.json get /v1/llm-configurations
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/llm-configurations:
    get:
      tags:
        - LLM Configurations
      summary: List Llm Configurations
      description: |-
        List all LLM configurations for the authenticated user's space.

        This endpoint:
        - Requires API key or session authentication
        - Returns all LLM configurations for the user's space
        - Results are ordered by creation date (newest first)

        Args:
            service: Injected LLM configuration service

        Returns:
            Response with list of LLM configurations

        Raises:
            400 Bad Request: If user doesn't have an associated space
      operationId: list_llm_configurations_v1_llm_configurations_get
      parameters:
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/Response_list_LLMConfigurationListItemSchema__
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_list_LLMConfigurationListItemSchema__:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          title: Data
          items:
            $ref: '#/components/schemas/LLMConfigurationListItemSchema'
          type: array
        message:
          title: Message
          type: string
      type: object
      title: Response[list[LLMConfigurationListItemSchema]]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    LLMConfigurationListItemSchema:
      properties:
        id:
          type: string
          title: Id
        display_name:
          type: string
          title: Display Name
        model_name:
          type: string
          title: Model Name
        secret_id:
          type: string
          title: Secret Id
      type: object
      required:
        - id
        - display_name
        - model_name
        - secret_id
      title: LLMConfigurationListItemSchema
      description: Schema for an LLM configuration item in list response
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Llm Configuration

> Create a new LLM configuration for the authenticated user's space.

This endpoint:
- Requires API key or session authentication
- Validates that the secret_id belongs to the user's space
- Creates a new LLM configuration with the provided settings

Args:
    service: Injected LLM configuration service
    payload: Request containing url, display_name, model_name, and secret_id

Returns:
    Response with created LLM configuration

Raises:
    400 Bad Request: If user doesn't have an associated space or secret is invalid



## OpenAPI

````yaml /openapi.json post /v1/llm-configurations
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/llm-configurations:
    post:
      tags:
        - LLM Configurations
      summary: Create Llm Configuration
      description: |-
        Create a new LLM configuration for the authenticated user's space.

        This endpoint:
        - Requires API key or session authentication
        - Validates that the secret_id belongs to the user's space
        - Creates a new LLM configuration with the provided settings

        Args:
            service: Injected LLM configuration service
            payload: Request containing url, display_name, model_name, and secret_id

        Returns:
            Response with created LLM configuration

        Raises:
            400 Bad Request: If user doesn't have an associated space or secret is invalid
      operationId: create_llm_configuration_v1_llm_configurations_post
      parameters:
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateLLMConfigurationSchema'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_LLMConfigurationResponseSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    CreateLLMConfigurationSchema:
      properties:
        base_url:
          title: Base Url
          description: The LLM API endpoint URL
          type: string
        display_name:
          type: string
          maxLength: 255
          minLength: 1
          title: Display Name
          description: Display name for the configuration
        model_name:
          type: string
          maxLength: 255
          minLength: 1
          title: Model Name
          description: The model name to use
        secret_id:
          type: string
          maxLength: 36
          minLength: 1
          title: Secret Id
          description: ID of the secret containing the API key
      type: object
      required:
        - display_name
        - model_name
        - secret_id
      title: CreateLLMConfigurationSchema
      description: Request schema for creating a new LLM configuration
    Response_LLMConfigurationResponseSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/LLMConfigurationResponseSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[LLMConfigurationResponseSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    LLMConfigurationResponseSchema:
      properties:
        id:
          type: string
          title: Id
        base_url:
          title: Base Url
          type: string
        display_name:
          type: string
          title: Display Name
        model_name:
          type: string
          title: Model Name
        secret_id:
          type: string
          title: Secret Id
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
      type: object
      required:
        - id
        - base_url
        - display_name
        - model_name
        - secret_id
        - created_at
        - updated_at
      title: LLMConfigurationResponseSchema
      description: Response schema for an LLM configuration
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Llm Configuration

> Get an LLM configuration by ID.

This endpoint:
- Requires API key or session authentication
- Returns the full LLM configuration details

Args:
    service: Injected LLM configuration service
    config_id: The ID of the LLM configuration to retrieve

Returns:
    Response with the LLM configuration

Raises:
    400 Bad Request: If user doesn't have an associated space
    404 Not Found: If the configuration doesn't exist



## OpenAPI

````yaml /openapi.json get /v1/llm-configurations/{config_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/llm-configurations/{config_id}:
    get:
      tags:
        - LLM Configurations
      summary: Get Llm Configuration
      description: |-
        Get an LLM configuration by ID.

        This endpoint:
        - Requires API key or session authentication
        - Returns the full LLM configuration details

        Args:
            service: Injected LLM configuration service
            config_id: The ID of the LLM configuration to retrieve

        Returns:
            Response with the LLM configuration

        Raises:
            400 Bad Request: If user doesn't have an associated space
            404 Not Found: If the configuration doesn't exist
      operationId: get_llm_configuration_v1_llm_configurations__config_id__get
      parameters:
        - name: config_id
          in: path
          required: true
          schema:
            type: string
            title: Config Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_LLMConfigurationResponseSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_LLMConfigurationResponseSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/LLMConfigurationResponseSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[LLMConfigurationResponseSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    LLMConfigurationResponseSchema:
      properties:
        id:
          type: string
          title: Id
        base_url:
          title: Base Url
          type: string
        display_name:
          type: string
          title: Display Name
        model_name:
          type: string
          title: Model Name
        secret_id:
          type: string
          title: Secret Id
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
      type: object
      required:
        - id
        - base_url
        - display_name
        - model_name
        - secret_id
        - created_at
        - updated_at
      title: LLMConfigurationResponseSchema
      description: Response schema for an LLM configuration
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Delete Llm Configuration

> Delete an LLM configuration by ID.

This endpoint:
- Requires API key or session authentication
- Permanently deletes the LLM configuration

Args:
    service: Injected LLM configuration service
    config_id: The ID of the LLM configuration to delete

Returns:
    Response confirming deletion

Raises:
    400 Bad Request: If user doesn't have an associated space
    404 Not Found: If the configuration doesn't exist



## OpenAPI

````yaml /openapi.json delete /v1/llm-configurations/{config_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/llm-configurations/{config_id}:
    delete:
      tags:
        - LLM Configurations
      summary: Delete Llm Configuration
      description: |-
        Delete an LLM configuration by ID.

        This endpoint:
        - Requires API key or session authentication
        - Permanently deletes the LLM configuration

        Args:
            service: Injected LLM configuration service
            config_id: The ID of the LLM configuration to delete

        Returns:
            Response confirming deletion

        Raises:
            400 Bad Request: If user doesn't have an associated space
            404 Not Found: If the configuration doesn't exist
      operationId: delete_llm_configuration_v1_llm_configurations__config_id__delete
      parameters:
        - name: config_id
          in: path
          required: true
          schema:
            type: string
            title: Config Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_NoneType_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_NoneType_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          type: 'null'
          title: Data
        message:
          title: Message
          type: string
      type: object
      title: Response[NoneType]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Update Llm Configuration

> Update an LLM configuration by ID.

This endpoint:
- Requires API key or session authentication
- Validates that the new secret_id (if provided) belongs to the user's space
- Updates only the provided fields

Args:
    service: Injected LLM configuration service
    config_id: The ID of the LLM configuration to update
    payload: Request containing fields to update

Returns:
    Response with the updated LLM configuration

Raises:
    400 Bad Request: If user doesn't have an associated space or secret is invalid
    404 Not Found: If the configuration doesn't exist



## OpenAPI

````yaml /openapi.json patch /v1/llm-configurations/{config_id}
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/llm-configurations/{config_id}:
    patch:
      tags:
        - LLM Configurations
      summary: Update Llm Configuration
      description: >-
        Update an LLM configuration by ID.


        This endpoint:

        - Requires API key or session authentication

        - Validates that the new secret_id (if provided) belongs to the user's
        space

        - Updates only the provided fields


        Args:
            service: Injected LLM configuration service
            config_id: The ID of the LLM configuration to update
            payload: Request containing fields to update

        Returns:
            Response with the updated LLM configuration

        Raises:
            400 Bad Request: If user doesn't have an associated space or secret is invalid
            404 Not Found: If the configuration doesn't exist
      operationId: update_llm_configuration_v1_llm_configurations__config_id__patch
      parameters:
        - name: config_id
          in: path
          required: true
          schema:
            type: string
            title: Config Id
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateLLMConfigurationSchema'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_LLMConfigurationResponseSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    UpdateLLMConfigurationSchema:
      properties:
        base_url:
          title: Base Url
          description: The LLM API endpoint URL
          type: string
          minLength: 1
        display_name:
          type: string
          maxLength: 255
          minLength: 1
          title: Display Name
          description: Display name for the configuration
        model_name:
          type: string
          maxLength: 255
          minLength: 1
          title: Model Name
          description: The model name to use
        secret_id:
          type: string
          maxLength: 36
          minLength: 1
          title: Secret Id
          description: ID of the secret containing the API key
      type: object
      title: UpdateLLMConfigurationSchema
      description: Request schema for updating an LLM configuration
    Response_LLMConfigurationResponseSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/LLMConfigurationResponseSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[LLMConfigurationResponseSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    LLMConfigurationResponseSchema:
      properties:
        id:
          type: string
          title: Id
        base_url:
          title: Base Url
          type: string
        display_name:
          type: string
          title: Display Name
        model_name:
          type: string
          title: Model Name
        secret_id:
          type: string
          title: Secret Id
        created_at:
          type: string
          format: date-time
          title: Created At
        updated_at:
          type: string
          format: date-time
          title: Updated At
      type: object
      required:
        - id
        - base_url
        - display_name
        - model_name
        - secret_id
        - created_at
        - updated_at
      title: LLMConfigurationResponseSchema
      description: Response schema for an LLM configuration
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Languages

> Return the list of supported languages with code and display name.



## OpenAPI

````yaml /openapi.json get /v1/languages
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/languages:
    get:
      tags:
        - Languages
      summary: Get Languages
      description: Return the list of supported languages with code and display name.
      operationId: get_languages_v1_languages_get
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_list_LanguageSchema__'
components:
  schemas:
    Response_list_LanguageSchema__:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          title: Data
          items:
            $ref: '#/components/schemas/LanguageSchema'
          type: array
        message:
          title: Message
          type: string
      type: object
      title: Response[list[LanguageSchema]]
    LanguageSchema:
      properties:
        language:
          type: string
          title: Language
          description: Display name of the language
        code:
          type: string
          title: Code
          description: ISO language code
      type: object
      required:
        - language
        - code
      title: LanguageSchema
      description: Schema for a supported language with code and display name.

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get User Credits

> Get the current user's credit balance.



## OpenAPI

````yaml /openapi.json get /v1/users/credits
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v1/users/credits:
    get:
      tags:
        - Users
      summary: Get User Credits
      description: Get the current user's credit balance.
      operationId: get_user_credits_v1_users_credits_get
      parameters:
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_UserCreditsSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    Response_UserCreditsSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/UserCreditsSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[UserCreditsSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    UserCreditsSchema:
      properties:
        credits_left:
          title: Credits Left
          type: string
          pattern: ^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$
      type: object
      required:
        - credits_left
      title: UserCreditsSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.liveavatar.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Embed V2

> Create an embed avatar with sandbox support.



## OpenAPI

````yaml /openapi.json post /v2/embeddings
openapi: 3.1.0
info:
  title: Live avatar API
  version: 0.1.0
servers:
  - url: https://api.liveavatar.com
security: []
paths:
  /v2/embeddings:
    post:
      tags:
        - Embeddings
      summary: Create Embed V2
      description: Create an embed avatar with sandbox support.
      operationId: create_embed_v2_v2_embeddings_post
      parameters:
        - name: la_session
          in: cookie
          required: false
          schema:
            title: La Session
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateEmbedV2RequestSchema'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Response_CreateEmbedV2ResponseSchema_'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyHeader: []
components:
  schemas:
    CreateEmbedV2RequestSchema:
      properties:
        avatar_id:
          type: string
          format: uuid
          title: Avatar Id
        context_id:
          type: string
          format: uuid
          title: Context Id
        voice_id:
          title: Voice Id
          type: string
          format: uuid
        type:
          $ref: '#/components/schemas/EmbedAvatarTypeEnum'
          default: DEFAULT
        max_session_duration:
          title: Max Session Duration
          description: Max session duration in seconds
          type: integer
          exclusiveMinimum: 0
        default_language:
          title: Default Language
          description: Default language code (e.g. 'en', 'es', 'multi')
          type: string
          maxLength: 5
        is_sandbox:
          type: boolean
          title: Is Sandbox
          description: Whether to enable sandbox mode for sessions
          default: false
        orientation:
          $ref: '#/components/schemas/EmbedOrientation'
          description: 'Embed orientation: horizontal (16:9) or vertical (9:16)'
          default: horizontal
      type: object
      required:
        - avatar_id
        - context_id
      title: CreateEmbedV2RequestSchema
    Response_CreateEmbedV2ResponseSchema_:
      properties:
        code:
          type: integer
          title: Code
          default: 100
        data:
          anyOf:
            - $ref: '#/components/schemas/CreateEmbedV2ResponseSchema'
            - type: 'null'
        message:
          title: Message
          type: string
      type: object
      title: Response[CreateEmbedV2ResponseSchema]
    HTTPValidationError:
      properties:
        detail:
          items:
            $ref: '#/components/schemas/ValidationError'
          type: array
          title: Detail
      type: object
      title: HTTPValidationError
    EmbedAvatarTypeEnum:
      type: string
      enum:
        - DEFAULT
        - WIDGET
      title: EmbedAvatarTypeEnum
    EmbedOrientation:
      type: string
      enum:
        - horizontal
        - vertical
      title: EmbedOrientation
    CreateEmbedV2ResponseSchema:
      properties:
        embed_id:
          type: string
          format: uuid
          title: Embed Id
        url:
          type: string
          title: Url
        script:
          title: Script
          type: string
        orientation:
          $ref: '#/components/schemas/EmbedOrientation'
          default: horizontal
      type: object
      required:
        - embed_id
        - url
      title: CreateEmbedV2ResponseSchema
    ValidationError:
      properties:
        loc:
          items:
            anyOf:
              - type: string
              - type: integer
          type: array
          title: Location
        msg:
          title: Message
          type: string
        type:
          type: string
          title: Error Type
        input:
          title: Input
        ctx:
          type: object
          title: Context
      type: object
      required:
        - loc
        - msg
        - type
      title: ValidationError
  securitySchemes:
    APIKeyHeader:
      type: apiKey
      in: header
      name: X-API-KEY

````