import { useEffect, useRef } from 'react'

export const AboutPage = () => {
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Animate progress ring on mount
    if (progressRef.current) {
      setTimeout(() => {
        progressRef.current?.style.setProperty('--progress', '0.15')
      }, 100)
    }
  }, [])

  return (
    <div className="about-page" style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '40px 20px',
      color: 'var(--text, #f5f7ff)',
    }}>
      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '60px',
        padding: '40px 20px',
        background: 'linear-gradient(135deg, var(--accent, #5ad1ff) 0%, var(--accent-strong, #4cb0f5) 100%)',
        borderRadius: '20px',
        color: 'white',
        boxShadow: '0 10px 40px rgba(90, 209, 255, 0.3)',
      }}>
        <div style={{
          fontSize: '72px',
          fontWeight: 'bold',
          marginBottom: '10px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
        }}>
          10,000
        </div>
        <div style={{
          fontSize: '32px',
          fontWeight: '600',
          marginBottom: '20px',
          opacity: 0.95,
        }}>
          Hours to Mastery
        </div>
        <div style={{
          fontSize: '18px',
          opacity: 0.9,
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6',
        }}>
          The journey from novice to expert isn't about talent—it's about deliberate, focused practice.
          MasteryTrack helps you clock those hours systematically, one session at a time.
        </div>
      </div>

      {/* The Rule Explained */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          marginBottom: '30px',
              color: 'var(--text, #f5f7ff)',
          borderBottom: '3px solid var(--accent, #5ad1ff)',
          paddingBottom: '10px',
        }}>
          What is the 10,000 Hour Rule?
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '30px',
          marginBottom: '40px',
        }}>
          <div style={{
            padding: '30px',
            backgroundColor: 'var(--surface, #0f1424)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            border: '2px solid var(--accent, #5ad1ff)',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '15px',
              textAlign: 'center',
            }}>🎯</div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '10px',
              color: 'var(--accent, #5ad1ff)',
            }}>Deliberate Practice</h3>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-muted, #9aa4c3)',
            }}>
              Not just any practice—focused, intentional work with clear goals and immediate feedback.
            </p>
          </div>

          <div style={{
            padding: '30px',
            backgroundColor: 'var(--surface, #0f1424)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '2px solid var(--success, #4ade80)',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '15px',
              textAlign: 'center',
            }}>⏱️</div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '10px',
              color: 'var(--success, #4ade80)',
            }}>Time Investment</h3>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-muted, #9aa4c3)',
            }}>
              Approximately 10,000 hours of deliberate practice to achieve world-class expertise in any field.
            </p>
          </div>

          <div style={{
            padding: '30px',
            backgroundColor: 'var(--surface, #0f1424)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '2px solid var(--warning, #fbbf24)',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '15px',
              textAlign: 'center',
            }}>📈</div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '10px',
              color: 'var(--warning, #fbbf24)',
            }}>Consistent Progress</h3>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-muted, #9aa4c3)',
            }}>
              Small daily sessions compound into extraordinary results over time. Consistency beats intensity.
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--surface-alt, #151b2f)',
          padding: '30px',
          borderRadius: '12px',
          borderLeft: '4px solid var(--accent, #5ad1ff)',
          marginTop: '30px',
        }}>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: 'var(--text, #f5f7ff)',
            margin: 0,
          }}>
            <strong>The Origin:</strong> Popularized by Malcolm Gladwell in his book <em>"Outliers: The Story of Success"</em>,
            the 10,000-hour rule is based on research by psychologist Anders Ericsson. While the exact number
            may vary, the core principle remains: <strong>expertise requires sustained, deliberate practice over many years.</strong>
          </p>
        </div>
      </section>

      {/* Visual Progress Ring */}
      <section style={{
        marginBottom: '60px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          marginBottom: '40px',
          color: 'var(--text, #f5f7ff)',
        }}>
          Your Journey to Mastery
        </h2>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '30px',
        }}>
          <div style={{
            position: 'relative',
            width: '300px',
            height: '300px',
          }}>
            <svg width="300" height="300" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="150"
                cy="150"
                r="130"
                fill="none"
                stroke="var(--border, rgba(255, 255, 255, 0.08))"
                strokeWidth="20"
              />
              <circle
                cx="150"
                cy="150"
                r="130"
                fill="none"
                stroke="var(--accent, #5ad1ff)"
                strokeWidth="20"
                strokeDasharray={`${2 * Math.PI * 130}`}
                strokeDashoffset={`${2 * Math.PI * 130 * (1 - 0.15)}`}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 1s ease-in-out',
                }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'var(--accent, #5ad1ff)',
              }}>
                1,500
              </div>
              <div style={{
                fontSize: '18px',
                color: 'var(--text-muted, #9aa4c3)',
                marginTop: '5px',
              }}>
                Hours Tracked
              </div>
              <div style={{
                fontSize: '14px',
                color: 'var(--text-muted, #9aa4c3)',
                marginTop: '10px',
              }}>
                15% Complete
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          maxWidth: '700px',
          margin: '0 auto',
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--surface, #0f1424)',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent, #5ad1ff)' }}>
              2.7 years
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9aa4c3)', marginTop: '5px' }}>
              At 2 hours/day
            </div>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--surface, #0f1424)',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success, #4ade80)' }}>
              1.4 years
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9aa4c3)', marginTop: '5px' }}>
              At 4 hours/day
            </div>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--surface, #0f1424)',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning, #fbbf24)' }}>
              0.9 years
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9aa4c3)', marginTop: '5px' }}>
              At 6 hours/day
            </div>
          </div>
        </div>
      </section>

      {/* Core Idea */}
      <section style={{
        marginBottom: '60px',
        backgroundColor: 'var(--surface, #0f1424)',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          marginBottom: '20px',
          color: 'var(--text, #f5f7ff)',
        }}>
          The Core Idea Behind MasteryTrack
        </h2>
          <div style={{
            fontSize: '18px',
            lineHeight: '1.8',
            color: 'var(--text, #f5f7ff)',
          }}>
          <p style={{ marginBottom: '20px' }}>
            MasteryTrack was born from a simple observation: <strong>most people underestimate the power of consistent,
            tracked practice.</strong> We built this app to solve three core problems:
          </p>
          
          <div style={{
            display: 'grid',
            gap: '20px',
            marginTop: '30px',
          }}>
            <div style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
            }}>
              <div style={{
                fontSize: '32px',
                flexShrink: 0,
              }}>🎯</div>
              <div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'var(--accent, #5ad1ff)',
                }}>Make Practice Visible</h3>
                <p style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: 'var(--text-muted, #9aa4c3)',
                  margin: 0,
                }}>
                  Track every minute of deliberate practice. See your progress accumulate over days, weeks, and months.
                  What gets measured gets improved.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
            }}>
              <div style={{
                fontSize: '32px',
                flexShrink: 0,
              }}>🛡️</div>
              <div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'var(--success, #4ade80)',
                }}>Remove Distractions</h3>
                <p style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: 'var(--text-muted, #9aa4c3)',
                  margin: 0,
                }}>
                  Auto-pause when you're idle or when distracting apps launch. Stay focused on what matters.
                  Productivity mode ensures you're actually practicing, not just running a timer.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
            }}>
              <div style={{
                fontSize: '32px',
                flexShrink: 0,
              }}>📊</div>
              <div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'var(--warning, #fbbf24)',
                }}>Build Momentum</h3>
                <p style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: 'var(--text-muted, #9aa4c3)',
                  margin: 0,
                }}>
                  Daily goals, streaks, and the visual progress ring create motivation. Every session brings you
                  closer to mastery. Small wins compound into extraordinary achievements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section style={{
        marginBottom: '60px',
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          marginBottom: '30px',
              color: 'var(--text, #f5f7ff)',
          borderBottom: '3px solid var(--accent, #5ad1ff)',
          paddingBottom: '10px',
        }}>
          Resources & Inspiration
        </h2>

        <div style={{
          display: 'grid',
          gap: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--surface, #0f1424)',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            borderLeft: '4px solid var(--accent, #5ad1ff)',
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '10px',
              color: 'var(--text, #f5f7ff)',
            }}>
              📚 "Outliers: The Story of Success" by Malcolm Gladwell
            </h3>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-muted, #9aa4c3)',
              margin: 0,
            }}>
              The book that popularized the 10,000-hour rule, exploring how opportunity, timing, and practice
              combine to create extraordinary success.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--surface, #0f1424)',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderLeft: '4px solid var(--success, #4ade80)',
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '10px',
              color: 'var(--text, #f5f7ff)',
            }}>
              🔬 Research by Anders Ericsson
            </h3>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-muted, #9aa4c3)',
              margin: 0,
            }}>
              The foundational research on deliberate practice and expertise development. Ericsson's work with
              violinists, chess players, and other experts revealed the importance of focused, intentional practice.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--surface, #0f1424)',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderLeft: '4px solid var(--warning, #fbbf24)',
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '10px',
              color: 'var(--text, #f5f7ff)',
            }}>
              💡 The Power of Deliberate Practice
            </h3>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-muted, #9aa4c3)',
              margin: 0,
            }}>
              Deliberate practice isn't just repetition—it's structured, goal-oriented practice with immediate
              feedback. It's pushing beyond your comfort zone, focusing on weaknesses, and maintaining intense
              concentration.
            </p>
          </div>
        </div>
      </section>

      {/* Credits */}
      <section style={{
        background: 'linear-gradient(135deg, var(--accent, #5ad1ff) 0%, var(--accent-strong, #4cb0f5) 100%)',
        padding: '40px',
        borderRadius: '16px',
        textAlign: 'center',
        color: 'white',
        boxShadow: '0 10px 40px rgba(90, 209, 255, 0.3)',
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '20px',
        }}>
          Credits & Acknowledgments
        </h2>
        
        <div style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
        }}>
          Created by <strong>Alpha Lencho</strong>
        </div>

        <div style={{
          fontSize: '16px',
          lineHeight: '1.8',
          opacity: 0.95,
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          <p style={{ marginBottom: '15px' }}>
            MasteryTrack is built with passion for helping people achieve mastery through consistent,
            deliberate practice. Every feature is designed to remove friction and keep you focused on what matters.
          </p>
          <p style={{ marginBottom: '15px' }}>
            <strong>Tech Stack:</strong> Tauri + React + Rust + TypeScript
          </p>
          <p style={{ margin: 0 }}>
            Thank you for choosing MasteryTrack. Here's to your journey toward 10,000 hours of mastery! 🚀
          </p>
        </div>
      </section>
    </div>
  )
}

